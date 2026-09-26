import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules } from '../blocker';
import { recordActivity } from '~/lib/activityService';
import { removeBlock } from '~/lib/siteService';
import { SiteBodySchema } from '~/types/messageSchemas';

/** ブロックリストから外す（`block = null`。追跡は続く） */
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

  // 解除は「利用者の操作でブロックが効かなくなったこと」なので、効いていた項目の削除だけ数える
  // （無効化済みの項目を消しても効かなくなるブロックは無く、トグル OFF と二重に数えてしまう）。
  // ブロックリストから外してもサイトは追跡中に残るので、保存の後に記録しても捨てられない
  if (removed.enabled) {
    await recordActivity({ kind: 'unblock', site: domain, at: new Date() });
  }

  return { success: true };
};
