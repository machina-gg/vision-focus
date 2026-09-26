import type { MessageHandler } from '~/lib/messaging';
import { clearActivity } from '~/lib/activityService';
import { updateBlockRules } from '../blocker';

/**
 * 分析データのリセット。事実の表を今日の分も含めてすべて消す。
 *
 * 時間制限の今日の使用量も同じ表から出しているので一緒に 0 に戻る。
 * 使い切ってブロック中だったサイトがその場で開けるよう、ルールも作り直す
 */
export const resetActivityHandler: MessageHandler<
  'reset-activity'
> = async () => {
  await clearActivity();
  await updateBlockRules();
  return { success: true };
};
