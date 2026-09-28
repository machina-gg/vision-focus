import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  createPreset: vi.fn()
}));

import { createPreset } from '~/lib/settingsService';
import { createPresetHandler as handler } from '../../handlers/create-preset';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  id?: string;
  error?: MessageError;
}

describe('create-preset ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createPreset).mockResolvedValue({ rejection: null, id: 'new' });
  });

  it.each([
    ['body が null', null],
    ['name が無い', {}],
    ['name が空白だけ', { name: '  ' }],
    ['name が文字列でない', { name: 1 }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(createPreset).not.toHaveBeenCalled();
  });

  it('作ったスタイルの ID を返す', async () => {
    const result = await invoke<Response>(handler, { name: 'Morning' });

    expect(result).toEqual({ success: true, id: 'new' });
    expect(createPreset).toHaveBeenCalledWith('Morning', expect.any(Date));
  });

  it('上限で拒まれたら preset-limit を返す', async () => {
    vi.mocked(createPreset).mockResolvedValue({ rejection: 'limit' });

    const result = await invoke<Response>(handler, { name: 'Morning' });

    expect(result).toEqual({
      success: false,
      error: { code: 'preset-limit' }
    });
  });

  it('保存に失敗したら save-failed を返す（例外を外に投げない）', async () => {
    vi.mocked(createPreset).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { name: 'Morning' });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
