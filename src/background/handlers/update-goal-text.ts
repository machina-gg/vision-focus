import type { MessageHandler } from '~/lib/messaging';
import { setGoalText } from '~/lib/settingsService';
import { UpdateGoalTextBodySchema } from '~/types/messageSchemas';

/**
 * update-goal-text: 既定の表示設定の目標文を書き換える
 * @param message data.goalText に新しい目標文（空白だけは拒む）
 * @returns 成功か、失敗の種類（invalid-request / save-failed）
 */
export const updateGoalTextHandler: MessageHandler<
  'update-goal-text'
> = async ({ data }) => {
  const parsed = UpdateGoalTextBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    await setGoalText(parsed.data.goalText);
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
