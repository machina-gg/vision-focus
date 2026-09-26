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

/**
 * パスワードが保存済みのハッシュと一致するか
 * @param password 入力されたパスワード
 * @param storedHash hashPassword で作って保存したハッシュ
 * @returns 一致すれば true
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
}

/**
 * パスワードの長さが 4〜100 文字か（外れたら errorKey に i18n のキーが入る）
 * @param password 確かめるパスワード
 * @returns isValid は長さが範囲内なら true、errorKey は範囲外のときの i18n のキー（範囲内なら null）
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errorKey: string | null;
} {
  if (password.length < 4) {
    return { isValid: false, errorKey: 'passwordTooShort' };
  }

  if (password.length > 100) {
    return { isValid: false, errorKey: 'passwordTooLong' };
  }

  return { isValid: true, errorKey: null };
}
