import type { MessageHandler } from '~/lib/messaging';
import { setUnblockConfirm } from '~/lib/settingsService';
import { UpdateUnblockConfirmBodySchema } from '~/types/messageSchemas';
import { passwordError } from './passwordRejection';

/**
 * update-unblock-confirm: 長押し確認の設定を保存する（保存済みより秒数を短くするときは、パスワード保護中ならパスワードを照合してから書く）
 * @param message data.unblockConfirm に新しい長押し確認の設定、data.password にパスワード保護中に照合するパスワード
 * @returns 成功か、失敗の種類（invalid-request / password-required / password-mismatch / save-failed）
 */
export const updateUnblockConfirmHandler: MessageHandler<
  'update-unblock-confirm'
> = async ({ data }) => {
  const parsed = UpdateUnblockConfirmBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const rejection = await setUnblockConfirm(
      parsed.data.unblockConfirm,
      parsed.data.password
    );
    if (rejection) return { success: false, error: passwordError(rejection) };
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
