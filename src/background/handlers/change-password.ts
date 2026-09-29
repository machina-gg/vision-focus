import type { MessageHandler } from '~/lib/messaging';
import { changePassword } from '~/lib/settingsService';
import { ChangePasswordBodySchema } from '~/types/messageSchemas';
import { passwordError, passwordStrengthError } from './passwordRejection';

/**
 * change-password: 新しいパスワードの長さを検査し、今のパスワードを照合してから新しいパスワードのハッシュに置き換える
 * @param message data.currentPassword に今のパスワード、data.newPassword に新しいパスワード（どちらも平文）
 * @returns 成功か、失敗の種類（invalid-request / password-not-set / password-mismatch / password-invalid / save-failed）
 */
export const changePasswordHandler: MessageHandler<'change-password'> = async ({
  data
}) => {
  const parsed = ChangePasswordBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { currentPassword, newPassword } = parsed.data;
  const strengthError = passwordStrengthError(newPassword);
  if (strengthError) return { success: false, error: strengthError };

  try {
    const rejection = await changePassword(currentPassword, newPassword);
    if (rejection) return { success: false, error: passwordError(rejection) };
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
