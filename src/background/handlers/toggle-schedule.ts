import type { MessageHandler } from '~/lib/messaging';
import { setScheduleEnabled } from '~/lib/settingsService';
import { updateBlockRules } from '../blocker';
import { ToggleScheduleBodySchema } from '~/types/messageSchemas';
import { scheduleError } from './scheduleRejection';

/**
 * toggle-schedule: スケジュールの有効・無効を切り替えてルールを更新する
 * @param message data.id に切り替えるスケジュールの ID、data.enabled に有効にするか
 * @returns 成功か、失敗の種類（invalid-request / schedule-not-found / save-failed）
 */
export const toggleScheduleHandler: MessageHandler<'toggle-schedule'> = async ({
  data
}) => {
  const parsed = ToggleScheduleBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { id, enabled } = parsed.data;

  try {
    const rejection = await setScheduleEnabled(id, enabled);
    if (rejection) {
      return { success: false, error: scheduleError(rejection) };
    }

    await updateBlockRules();

    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
