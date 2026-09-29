import { validatePasswordStrength } from '~/lib/password';
import type { PasswordRejection } from '~/lib/settingsService';
import type { MessageError } from '~/types/messages';

/**
 * パスワードの書き込み・照合を拒んだ理由を、画面へ返す失敗の種類にする
 * @param rejection settingsService が返した拒否の理由
 * @returns 画面へ返す失敗
 */
export function passwordError(rejection: PasswordRejection): MessageError {
  switch (rejection) {
    case 'already-set':
      return { code: 'password-already-set' };
    case 'not-set':
      return { code: 'password-not-set' };
    case 'mismatch':
      return { code: 'password-mismatch' };
    case 'required':
      return { code: 'password-required' };
  }
}

/**
 * 新しいパスワードの長さを検査し、範囲外なら画面へ返す失敗にする
 * @param password 新しいパスワード（平文）
 * @returns 範囲外なら password-invalid。範囲内なら null
 */
export function passwordStrengthError(password: string): MessageError | null {
  const reason = validatePasswordStrength(password);
  return reason ? { code: 'password-invalid', reason } : null;
}
