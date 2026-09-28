import type { MessageHandler } from '~/lib/messaging';
import { removeSchedule } from '~/lib/settingsService';
import { updateBlockRules } from '../blocker';
import { RemoveScheduleBodySchema } from '~/types/messageSchemas';
import { scheduleError } from './scheduleRejection';

/**
 * remove-schedule: スケジュールを消してルールを更新する
 * @param message data.id に消すスケジュールの ID
 * @returns 成功か、失敗の種類（invalid-request / schedule-not-found / save-failed）
 */
export const removeScheduleHandler: MessageHandler<'remove-schedule'> = async ({
  data
}) => {
  const parsed = RemoveScheduleBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const rejection = await removeSchedule(parsed.data.id);
    if (rejection) {
      return { success: false, error: scheduleError(rejection) };
    }

    await updateBlockRules();

    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
