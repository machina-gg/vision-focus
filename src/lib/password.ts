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

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
}

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
