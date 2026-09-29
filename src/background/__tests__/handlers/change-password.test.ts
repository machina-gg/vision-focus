import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  changePassword: vi.fn()
}));

import { changePassword } from '~/lib/settingsService';
import { changePasswordHandler as handler } from '../../handlers/change-password';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

const body = { currentPassword: 'old1', newPassword: 'new1' };

describe('change-password ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(changePassword).mockResolvedValue(null);
  });

  it.each([
    ['body が null', null],
    ['currentPassword が無い', { newPassword: 'new1' }],
    ['newPassword が無い', { currentPassword: 'old1' }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, data) => {
    const result = await invoke<Response>(handler, data);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ['短すぎる', 'abc', 'too-short'],
    ['長すぎる', 'a'.repeat(101), 'too-long']
  ] as const)(
    '新しいパスワードが%sなら password-invalid（%s）を返し、何も変えない',
    async (_label, newPassword, reason) => {
      const result = await invoke<Response>(handler, { ...body, newPassword });

      expect(result).toEqual({
        success: false,
        error: { code: 'password-invalid', reason }
      });
      expect(changePassword).not.toHaveBeenCalled();
    }
  );

  it('今のパスワードと新しいパスワードを渡して置き換える', async () => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({ success: true });
    expect(changePassword).toHaveBeenCalledWith('old1', 'new1');
  });

  it.each([
    ['not-set', 'password-not-set'],
    ['mismatch', 'password-mismatch']
  ] as const)('%s で拒まれたら %s を返す', async (rejection, code) => {
    vi.mocked(changePassword).mockResolvedValue(rejection);

    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({ success: false, error: { code } });
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(changePassword).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
