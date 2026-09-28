import type { MessageHandler } from '~/lib/messaging';
import { setNotifications } from '~/lib/settingsService';
import { UpdateNotificationsBodySchema } from '~/types/messageSchemas';

/**
 * update-notifications: 残り時間の通知の設定を保存する
 * @param message data.notifications に新しい通知の設定
 * @returns 成功か、失敗の種類（invalid-request / save-failed）
 */
export const updateNotificationsHandler: MessageHandler<
  'update-notifications'
> = async ({ data }) => {
  const parsed = UpdateNotificationsBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    await setNotifications(parsed.data.notifications);
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
