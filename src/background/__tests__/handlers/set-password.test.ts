import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  setPassword: vi.fn()
}));

import { setPassword } from '~/lib/settingsService';
import { setPasswordHandler as handler } from '../../handlers/set-password';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('set-password ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setPassword).mockResolvedValue(null);
  });

  it.each([
    ['body が null', null],
    ['password が無い', {}],
    ['password が文字列でない', { password: 1234 }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(setPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['短すぎる', 'abc', 'too-short'],
    ['長すぎる', 'a'.repeat(101), 'too-long']
  ] as const)(
    'パスワードが%sなら password-invalid（%s）を返し、何も変えない',
    async (_label, password, reason) => {
      const result = await invoke<Response>(handler, { password });

      expect(result).toEqual({
        success: false,
        error: { code: 'password-invalid', reason }
      });
      expect(setPassword).not.toHaveBeenCalled();
    }
  );

  it('平文のパスワードを渡して保存する', async () => {
    const result = await invoke<Response>(handler, { password: 'secret' });

    expect(result).toEqual({ success: true });
    expect(setPassword).toHaveBeenCalledWith('secret');
  });

  it('設定済みなら password-already-set を返す', async () => {
    vi.mocked(setPassword).mockResolvedValue('already-set');

    const result = await invoke<Response>(handler, { password: 'secret' });

    expect(result).toEqual({
      success: false,
      error: { code: 'password-already-set' }
    });
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(setPassword).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { password: 'secret' });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
