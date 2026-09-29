import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import {
  UpdateYouTubeSettingsBodySchema,
  type UpdateYouTubeSettingsBody
} from '~/types/messageSchemas';
import { recordActivity } from '~/lib/activityService';
import { checkUnblockPassword } from '~/lib/settingsService';
import { updateYouTubeSite, type YouTubeSiteUpdate } from '~/lib/siteService';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import { passwordError } from './passwordRejection';
import { addSiteError } from './siteRejection';

function toSiteUpdate(
  value: UpdateYouTubeSettingsBody['youtube']
): YouTubeSiteUpdate {
  if (!value.enabled) return { youtube: null, block: null };
  return {
    youtube: {
      hideShorts: value.hideShorts,
      hideRecommendations: value.hideRecommendations,
      hideComments: value.hideComments,
      hideHomeFeed: value.hideHomeFeed
    },
    block: { enabled: value.blockAccess, timeLimit: value.timeLimit ?? null }
  };
}

/**
 * update-youtube-settings: YouTube の非表示機能とアクセスのブロックを保存してルールを更新する（ブロックを外したら解除として記録し、掛けたら開いているタブもブロックする。パスワード保護中に有効なアクセスのブロックを外すときはパスワードを照合してから書く。youtube.com が許可サイトのときと、新しく作ると許されない入れ子になるときは書かない）
 * @param message data.youtube に YouTube の設定（enabled が false なら非表示機能もブロックも外す）、data.password にパスワード保護中に照合するパスワード
 * @returns 成功か、失敗の種類（invalid-request / already-allowed / nested-site / password-required / password-mismatch / save-failed）
 */
export const updateYouTubeSettingsHandler: MessageHandler<
  'update-youtube-settings'
> = async ({ data }) => {
  const parsed = UpdateYouTubeSettingsBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const update = toSiteUpdate(parsed.data.youtube);
  const blocksAccess = update.block?.enabled === true;

  try {
    const written = await updateYouTubeSite(update, new Date(), (weakens) =>
      checkUnblockPassword(parsed.data.password, weakens)
    );
    if (written.rejection !== null) {
      const { by, rejection } = written.rejection;
      return {
        success: false,
        error:
          by === 'site'
            ? addSiteError(YOUTUBE_DOMAIN, rejection, 'already-blocked')
            : passwordError(rejection)
      };
    }

    const { before } = written;
    const wasBlockingAccess =
      before?.rule?.kind === 'block' && before.rule.enabled;

    await updateBlockRules();

    if (wasBlockingAccess && !blocksAccess) {
      await recordActivity({
        kind: 'unblock',
        site: YOUTUBE_DOMAIN,
        at: new Date()
      });
    }

    // ルール更新は新規の遷移にしか効かないため、開いているタブは明示的にブロックする
    if (!wasBlockingAccess && blocksAccess) {
      await blockExistingTabs();
    }

    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
