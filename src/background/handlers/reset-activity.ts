import type { MessageHandler } from '~/lib/messaging';
import { clearActivity } from '~/lib/activityService';
import { updateBlockRules } from '../blocker';

// 時間制限の使用量も同じ表から出すので、使い切ってブロック中のサイトを開けるようルールも作り直す
export const resetActivityHandler: MessageHandler<
  'reset-activity'
> = async () => {
  await clearActivity();
  await updateBlockRules();
  return { success: true };
};
