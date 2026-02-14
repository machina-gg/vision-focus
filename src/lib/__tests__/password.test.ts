import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength
} from '~/lib/password';

describe('hashPassword', () => {
  it('文字列のSHA-256ハッシュ（16進数）を返す', async () => {
    const hash = await hashPassword('test');
    // SHA-256 ハッシュは64文字の16進数
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('同じパスワードは同じハッシュを返す', async () => {
    const hash1 = await hashPassword('mypassword');
    const hash2 = await hashPassword('mypassword');
    expect(hash1).toBe(hash2);
  });

  it('異なるパスワードは異なるハッシュを返す', async () => {
    const hash1 = await hashPassword('password1');
    const hash2 = await hashPassword('password2');
    expect(hash1).not.toBe(hash2);
  });

  it('空文字列もハッシュできる', async () => {
    const hash = await hashPassword('');
    expect(hash).toHaveLength(64);
  });
});

describe('verifyPassword', () => {
  it('正しいパスワードでtrueを返す', async () => {
    const hash = await hashPassword('correct');
    const result = await verifyPassword('correct', hash);
    expect(result).toBe(true);
  });

  it('間違ったパスワードでfalseを返す', async () => {
    const hash = await hashPassword('correct');
    const result = await verifyPassword('wrong', hash);
    expect(result).toBe(false);
  });
});

describe('validatePasswordStrength', () => {
  it('4文字未満は無効（passwordTooShort）', () => {
    const result = validatePasswordStrength('abc');
    expect(result.isValid).toBe(false);
    expect(result.errorKey).toBe('passwordTooShort');
  });

  it('100文字超は無効（passwordTooLong）', () => {
    const result = validatePasswordStrength('a'.repeat(101));
    expect(result.isValid).toBe(false);
    expect(result.errorKey).toBe('passwordTooLong');
  });

  it('4文字以上100文字以下は有効', () => {
    const result = validatePasswordStrength('abcd');
    expect(result.isValid).toBe(true);
    expect(result.errorKey).toBeNull();
  });

  it('ちょうど100文字は有効', () => {
    const result = validatePasswordStrength('a'.repeat(100));
    expect(result.isValid).toBe(true);
  });

  it('ちょうど4文字は有効', () => {
    const result = validatePasswordStrength('abcd');
    expect(result.isValid).toBe(true);
  });
});
