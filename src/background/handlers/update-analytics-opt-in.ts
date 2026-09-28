import type { MessageHandler } from '~/lib/messaging';
import { setAnalyticsOptIn } from '~/lib/settingsService';
import { UpdateAnalyticsOptInBodySchema } from '~/types/messageSchemas';

/**
 * update-analytics-opt-in: 利用状況の送信への同意・拒否を、受け取った時刻を選んだ時刻として保存する
 * @param message data.enabled に同意するか
 * @returns 成功か、失敗の種類（invalid-request / save-failed）
 */
export const updateAnalyticsOptInHandler: MessageHandler<
  'update-analytics-opt-in'
> = async ({ data }) => {
  const parsed = UpdateAnalyticsOptInBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    await setAnalyticsOptIn(parsed.data.enabled, new Date());
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
