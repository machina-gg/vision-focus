import type { MessageHandler } from '~/lib/messaging';
import { removePassword } from '~/lib/settingsService';
import { RemovePasswordBodySchema } from '~/types/messageSchemas';
import { passwordError } from './passwordRejection';

/**
 * remove-password: 今のパスワードを照合してから、パスワード保護をやめる
 * @param message data.currentPassword に今のパスワード（平文）
 * @returns 成功か、失敗の種類（invalid-request / password-not-set / password-mismatch / save-failed）
 */
export const removePasswordHandler: MessageHandler<'remove-password'> = async ({
  data
}) => {
  const parsed = RemovePasswordBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const rejection = await removePassword(parsed.data.currentPassword);
    if (rejection) return { success: false, error: passwordError(rejection) };
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
