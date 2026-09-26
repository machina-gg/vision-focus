import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules } from '../blocker';
import { recordActivity } from '~/lib/activityService';
import { removeBlock } from '~/lib/siteService';
import { SiteBodySchema } from '~/types/messageSchemas';

export const removeBlockHandler: MessageHandler<'remove-block'> = async ({
  data
}) => {
  const parsed = SiteBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false };
  }
  const { domain } = parsed.data;

  const removed = await removeBlock(domain);
  if (!removed) {
    return { success: true };
  }

  await updateBlockRules();

  // 無効化済みの項目の削除まで数えると、トグル OFF の解除と二重に数えてしまう
  if (removed.enabled) {
    await recordActivity({ kind: 'unblock', site: domain, at: new Date() });
  }

  return { success: true };
};
