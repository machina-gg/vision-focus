import type { MessageHandler } from '~/lib/messaging';
import { setUnblockConfirm } from '~/lib/settingsService';
import { UpdateUnblockConfirmBodySchema } from '~/types/messageSchemas';

/**
 * update-unblock-confirm: 長押し確認の設定を保存する
 * @param message data.unblockConfirm に新しい長押し確認の設定
 * @returns 成功か、失敗の種類（invalid-request / save-failed）
 */
export const updateUnblockConfirmHandler: MessageHandler<
  'update-unblock-confirm'
> = async ({ data }) => {
  const parsed = UpdateUnblockConfirmBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    await setUnblockConfirm(parsed.data.unblockConfirm);
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
