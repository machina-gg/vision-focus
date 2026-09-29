import type { MessageHandler } from '~/lib/messaging';
import { setPassword } from '~/lib/settingsService';
import { SetPasswordBodySchema } from '~/types/messageSchemas';
import { passwordError, passwordStrengthError } from './passwordRejection';

/**
 * set-password: 長さを検査してからパスワードをハッシュにして保存し、パスワード保護を始める
 * @param message data.password に新しいパスワード（平文）
 * @returns 成功か、失敗の種類（invalid-request / password-already-set / password-invalid / save-failed）
 */
export const setPasswordHandler: MessageHandler<'set-password'> = async ({
  data
}) => {
  const parsed = SetPasswordBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const strengthError = passwordStrengthError(parsed.data.password);
  if (strengthError) return { success: false, error: strengthError };

  try {
    const rejection = await setPassword(parsed.data.password);
    if (rejection) return { success: false, error: passwordError(rejection) };
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
