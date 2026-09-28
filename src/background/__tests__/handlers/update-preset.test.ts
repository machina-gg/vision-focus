import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  updatePreset: vi.fn()
}));

import { updatePreset } from '~/lib/settingsService';
import { updatePresetHandler as handler } from '../../handlers/update-preset';
import type { MessageError } from '~/types/messages';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

interface Response {
  success: boolean;
  error?: MessageError;
}

const display = {
  ...DEFAULT_DISPLAY_SETTINGS,
  goalText: 'Focus',
  customBackgroundData: 'data:image/jpeg;base64,AAAA'
};
const body = { id: 'p1', name: 'Morning', display };

describe('update-preset ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updatePreset).mockResolvedValue(null);
  });

  it.each([
    ['body が null', null],
    ['id が空', { ...body, id: '' }],
    ['name が空白だけ', { ...body, name: ' ' }],
    ['display が無い', { id: 'p1', name: 'Morning' }],
    [
      '背景の種類が選択肢に無い',
      { ...body, display: { ...display, backgroundType: 'video' } }
    ],
    [
      'フォントが知らないもの',
      {
        ...body,
        display: {
          ...display,
          fontSettings: { family: 'comic-sans', size: 'md', weight: 'bold' }
        }
      }
    ]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, data) => {
    const result = await invoke<Response>(handler, data);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(updatePreset).not.toHaveBeenCalled();
  });

  it('名前と表示設定（画像の data URL を含む）を渡して置き換える', async () => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({ success: true });
    expect(updatePreset).toHaveBeenCalledWith(body);
  });

  it('対象が無ければ preset-not-found を返す', async () => {
    vi.mocked(updatePreset).mockResolvedValue('not-found');

    expect(await invoke<Response>(handler, body)).toEqual({
      success: false,
      error: { code: 'preset-not-found' }
    });
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(updatePreset).mockRejectedValue(new Error('storage full'));

    expect(await invoke<Response>(handler, body)).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
  });
});
