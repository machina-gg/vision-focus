import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  deletePreset: vi.fn()
}));

import { deletePreset } from '~/lib/settingsService';
import { deletePresetHandler as handler } from '../../handlers/delete-preset';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('delete-preset ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deletePreset).mockResolvedValue(null);
  });

  it.each([
    ['body が null', null],
    ['id が無い', {}],
    ['id が空', { id: '' }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(deletePreset).not.toHaveBeenCalled();
  });

  it('指定したスタイルを消す', async () => {
    const result = await invoke<Response>(handler, { id: 'p1' });

    expect(result).toEqual({ success: true });
    expect(deletePreset).toHaveBeenCalledWith('p1');
  });

  it('対象が無ければ preset-not-found を返す', async () => {
    vi.mocked(deletePreset).mockResolvedValue('not-found');

    expect(await invoke<Response>(handler, { id: 'p1' })).toEqual({
      success: false,
      error: { code: 'preset-not-found' }
    });
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(deletePreset).mockRejectedValue(new Error('storage full'));

    expect(await invoke<Response>(handler, { id: 'p1' })).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
  });
});
