import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  updatePreset: vi.fn()
}));

import { updatePreset } from '~/lib/settingsService';
import { updatePresetHandler as handler } from '../../handlers/update-preset';
import type { MessageError } from '~/types/messages';
import { IMAGE_LIMITS } from '~/constants/limits';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

interface Response {
  success: boolean;
  error?: MessageError;
}

const JPEG = 'data:image/jpeg;base64,/9j/AAAA';

const display = { ...DEFAULT_DISPLAY_SETTINGS, goalText: 'Focus' };
const body = {
  id: 'p1',
  name: 'Morning',
  display,
  image: { kind: 'set', dataUrl: JPEG }
};

describe('update-preset ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updatePreset).mockResolvedValue(null);
  });

  it.each([
    ['body が null', null],
    ['id が空', { ...body, id: '' }],
    ['name が空白だけ', { ...body, name: ' ' }],
    ['display が無い', { id: 'p1', name: 'Morning', image: { kind: 'keep' } }],
    ['image が無い', { id: 'p1', name: 'Morning', display }],
    ['image の kind が知らないもの', { ...body, image: { kind: 'share' } }],
    ['set なのに dataUrl が無い', { ...body, image: { kind: 'set' } }],
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

  it.each([
    ['set', body.image],
    ['keep', { kind: 'keep' }],
    ['clear', { kind: 'clear' }]
  ])(
    '画像が %s なら、名前・表示設定・画像の変え方を渡して置き換える',
    async (_kind, image) => {
      const result = await invoke<Response>(handler, { ...body, image });

      expect(result).toEqual({ success: true });
      expect(updatePreset).toHaveBeenCalledWith({ ...body, image });
    }
  );

  it('画像の欄を持たない表示設定を渡し、送られた余計な欄は落とす', async () => {
    await invoke<Response>(handler, {
      ...body,
      display: { ...display, customBackgroundData: JPEG }
    });

    expect(updatePreset).toHaveBeenCalledWith(body);
  });

  it.each([
    ['JPEG でない data URL', 'data:image/png;base64,AAAA'],
    ['data URL でない文字列', 'https://example.com/a.jpg'],
    ['base64 でない中身', 'data:image/jpeg;base64,<script>'],
    [
      '上限（IMAGE_LIMITS.TARGET_SIZE）より長い',
      `data:image/jpeg;base64,${'A'.repeat(IMAGE_LIMITS.TARGET_SIZE)}`
    ]
  ])(
    'set の画像が%sなら image-invalid を返し、何も変えない',
    async (_label, dataUrl) => {
      const result = await invoke<Response>(handler, {
        ...body,
        image: { kind: 'set', dataUrl }
      });

      expect(result).toEqual({
        success: false,
        error: { code: 'image-invalid' }
      });
      expect(updatePreset).not.toHaveBeenCalled();
    }
  );

  it('上限ちょうどの長さの画像は受け付ける', async () => {
    const prefix = 'data:image/jpeg;base64,';
    const dataUrl = `${prefix}${'A'.repeat(IMAGE_LIMITS.TARGET_SIZE - prefix.length)}`;

    const result = await invoke<Response>(handler, {
      ...body,
      image: { kind: 'set', dataUrl }
    });

    expect(result).toEqual({ success: true });
  });

  it('名前・目標文・補足の文の前後の空白を除いてから置き換える', async () => {
    await invoke<Response>(handler, {
      ...body,
      name: ' Morning ',
      display: { ...display, goalText: ' Focus\n', goalSubText: '  sub ' }
    });

    expect(updatePreset).toHaveBeenCalledWith({
      ...body,
      name: 'Morning',
      display: { ...display, goalText: 'Focus', goalSubText: 'sub' }
    });
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
