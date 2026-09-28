import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  setUnblockConfirm: vi.fn()
}));

import { setUnblockConfirm } from '~/lib/settingsService';
import { updateUnblockConfirmHandler as handler } from '../../handlers/update-unblock-confirm';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('update-unblock-confirm ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setUnblockConfirm).mockResolvedValue(undefined);
  });

  it.each([
    ['body が null', null],
    ['unblockConfirm が無い', {}],
    ['秒数が選択肢に無い', { unblockConfirm: { holdSeconds: 15 } }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(setUnblockConfirm).not.toHaveBeenCalled();
  });

  it('長押し確認の設定を保存する', async () => {
    const result = await invoke<Response>(handler, {
      unblockConfirm: { holdSeconds: 30 }
    });

    expect(result).toEqual({ success: true });
    expect(setUnblockConfirm).toHaveBeenCalledWith({ holdSeconds: 30 });
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(setUnblockConfirm).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      unblockConfirm: { holdSeconds: 30 }
    });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
