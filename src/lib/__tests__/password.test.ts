import { describe, expect, it } from 'vitest';

import { hashPassword, validatePasswordStrength } from '~/lib/password';

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

describe('validatePasswordStrength', () => {
  it.each([
    ['4文字未満', 'abc', 'too-short'],
    ['空', '', 'too-short'],
    ['100文字超', 'a'.repeat(101), 'too-long'],
    ['ちょうど4文字', 'abcd', null],
    ['ちょうど100文字', 'a'.repeat(100), null]
  ])('%s は %s', (_label, password, expected) => {
    expect(validatePasswordStrength(password)).toBe(expected);
  });
});
