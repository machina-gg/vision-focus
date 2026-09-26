import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import {
  UpdateYouTubeSettingsBodySchema,
  type UpdateYouTubeSettingsBody
} from '~/types/messageSchemas';
import { recordActivity } from '~/lib/activityService';
import { updateYouTubeSite, type YouTubeSiteUpdate } from '~/lib/siteService';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';

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

export const updateYouTubeSettingsHandler: MessageHandler<
  'update-youtube-settings'
> = async ({ data }) => {
  const parsed = UpdateYouTubeSettingsBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const update = toSiteUpdate(parsed.data.youtube);

  try {
    const before = await updateYouTubeSite(update, new Date());

    const wasBlockingAccess = before?.block?.enabled === true;
    const blocksAccess = update.block?.enabled === true;

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
