import type { MessageHandler } from '~/lib/messaging';
import { addSchedule } from '~/lib/settingsService';
import { updateBlockRules } from '../blocker';
import { AddScheduleBodySchema } from '~/types/messageSchemas';
import { scheduleError } from './scheduleRejection';

/**
 * add-schedule: スケジュールを有効な状態で足してルールを更新する（ID は background が振る）
 * @param message data.schedule に足すスケジュールの入力値
 * @returns 成功か、失敗の種類（invalid-request / schedule-overlap / preset-not-found / save-failed）
 */
export const addScheduleHandler: MessageHandler<'add-schedule'> = async ({
  data
}) => {
  const parsed = AddScheduleBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const rejection = await addSchedule(parsed.data.schedule);
    if (rejection) {
      return { success: false, error: scheduleError(rejection) };
    }

    await updateBlockRules();

    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
