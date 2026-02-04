/**
 * Password utility functions using Web Crypto API
 * Used for password protection on unblock operations
 */

/**
 * Hash a password using SHA-256
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hex-encoded hash
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify a password against a stored hash
 * @param password - Plain text password to verify
 * @param storedHash - Previously stored hash to compare against
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid and optional error message
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errorKey: string | null;
} {
  // Minimum length requirement
  if (password.length < 4) {
    return { isValid: false, errorKey: 'passwordTooShort' };
  }

  // Maximum length to prevent abuse
  if (password.length > 100) {
    return { isValid: false, errorKey: 'passwordTooLong' };
  }

  return { isValid: true, errorKey: null };
}
