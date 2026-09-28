import type { MessageHandler } from '~/lib/messaging';
import { updateSchedule } from '~/lib/settingsService';
import { updateBlockRules } from '../blocker';
import { UpdateScheduleBodySchema } from '~/types/messageSchemas';
import { normalizeEndTime } from '~/lib/time';
import { scheduleError } from './scheduleRejection';

/**
 * update-schedule: スケジュールの入力値を置き換えてルールを更新する（有効・無効は保存済みの値を保つ。終了時刻 00:00 は 24:00 にして保存する）
 * @param message data.id に置き換えるスケジュールの ID、data.schedule に新しい入力値
 * @returns 成功か、失敗の種類（invalid-request / schedule-not-found / schedule-overlap / preset-not-found / save-failed）
 */
export const updateScheduleHandler: MessageHandler<'update-schedule'> = async ({
  data
}) => {
  const parsed = UpdateScheduleBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { id, schedule } = parsed.data;

  try {
    const rejection = await updateSchedule(id, {
      ...schedule,
      endTime: normalizeEndTime(schedule.endTime)
    });
    if (rejection) {
      return { success: false, error: scheduleError(rejection) };
    }

    await updateBlockRules();

    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
