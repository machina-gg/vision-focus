import type { MessageHandler } from '~/lib/messaging';
import { setScheduleEnabled } from '~/lib/settingsService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { ToggleScheduleBodySchema } from '~/types/messageSchemas';
import { scheduleError } from './scheduleRejection';

/**
 * toggle-schedule: スケジュールの有効・無効を切り替えてルールを更新する（有効にして一時停止を解いたら、開いているタブもブロックする）
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
    const result = await setScheduleEnabled(id, enabled);
    if (result.rejection) {
      return { success: false, error: scheduleError(result.rejection) };
    }

    await updateBlockRules();

    if (result.resumed) {
      await blockExistingTabs();
    }

    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
