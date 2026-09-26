import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import {
  UpdateYouTubeSettingsBodySchema,
  type UpdateYouTubeSettingsBody
} from '~/types/messageSchemas';
import { recordActivity } from '~/lib/activityService';
import { updateYouTubeSite, type YouTubeSiteUpdate } from '~/lib/siteService';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';

/**
 * YouTube の節の値を youtube.com の追跡中のサイトに書く形へ変える。
 * 機能全体を無効にするとアクセスブロックも外れる（非表示もブロックも使わない状態）。
 * アクセスブロックを外すとブロック設定ごと消える（時間制限も残さない）
 */
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
    block: value.blockAccess
      ? { enabled: true, timeLimit: value.timeLimit ?? null }
      : null
  };
}

/**
 * YouTube 設定を保存するメッセージハンドラ。
 *
 * ブロックリストの操作（add-block / toggle-block）と同じく、保存と既存タブの
 * ブロックを background 側で完結させる。アクセスブロックが無効から有効に
 * 変わった場合だけ、開いている YouTube のタブをブロックする。
 *
 * どのタブを実際に置き換えるかは blockService が決める。時間制限を設定している
 * 場合は超過するまでブロックされないため、ここで blockExistingTabs() を呼んでも
 * タブは置き換わらない
 */
export const updateYouTubeSettingsHandler: MessageHandler<
  'update-youtube-settings'
> = async ({ data }) => {
  const parsed = UpdateYouTubeSettingsBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Invalid request body' };
  }

  const update = toSiteUpdate(parsed.data.youtube);

  try {
    const before = await updateYouTubeSite(update, new Date());

    // 保存前の値と比べる（保存後は新旧の区別が付かなくなる）
    const wasBlockingAccess = before?.block?.enabled === true;
    const blocksAccess = update.block?.enabled === true;

    // declarativeNetRequest のルールを設定に追従させる
    await updateBlockRules();

    // アクセスブロックが効かなくなる操作を 1 回の解除として記録する
    // （機能全体の無効化でアクセスブロックが外れる場合も含む）。
    // youtube.com は機能を無効にしても追跡中に残るので、保存の後に記録しても捨てられない
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
    return { success: false, error: 'Failed to update YouTube settings' };
  }
};
