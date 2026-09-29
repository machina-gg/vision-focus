import type { PasswordSettings } from '~/types/storage';

/**
 * パスワードの SHA-256 ハッシュ（16 進文字列）
 * @param password ハッシュにするパスワード
 * @returns 64 桁の小文字 16 進文字列
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

/** パスワードの長さが範囲外である理由（too-short = 4 文字未満 / too-long = 100 文字超） */
export type PasswordStrengthProblem = 'too-short' | 'too-long';

/**
 * パスワードの長さが 4〜100 文字か
 * @param password 確かめるパスワード
 * @returns 範囲外ならその理由。範囲内なら null
 */
export function validatePasswordStrength(
  password: string
): PasswordStrengthProblem | null {
  if (password.length < 4) return 'too-short';
  if (password.length > 100) return 'too-long';
  return null;
}

/**
 * パスワード保護中か（有効で、照合に使うハッシュがあるときだけ保護中とする）。background の照合と画面の表示の両方がこの判定に従う
 * @param password 保存済みのパスワード設定
 * @returns 保護中なら true
 */
export function isProtectedByPassword(password: PasswordSettings): boolean {
  return password.enabled && password.passwordHash !== null;
}
