import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  removePassword: vi.fn()
}));

import { removePassword } from '~/lib/settingsService';
import { removePasswordHandler as handler } from '../../handlers/remove-password';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('remove-password ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(removePassword).mockResolvedValue(null);
  });

  it.each([
    ['body が null', null],
    ['currentPassword が無い', {}],
    ['currentPassword が文字列でない', { currentPassword: 1 }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, data) => {
    const result = await invoke<Response>(handler, data);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(removePassword).not.toHaveBeenCalled();
  });

  it('今のパスワードを渡して保護をやめる', async () => {
    const result = await invoke<Response>(handler, { currentPassword: 'old1' });

    expect(result).toEqual({ success: true });
    expect(removePassword).toHaveBeenCalledWith('old1');
  });

  it.each([
    ['not-set', 'password-not-set'],
    ['mismatch', 'password-mismatch']
  ] as const)('%s で拒まれたら %s を返す', async (rejection, code) => {
    vi.mocked(removePassword).mockResolvedValue(rejection);

    const result = await invoke<Response>(handler, {
      currentPassword: 'old1'
    });

    expect(result).toEqual({ success: false, error: { code } });
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(removePassword).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { currentPassword: 'old1' });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
