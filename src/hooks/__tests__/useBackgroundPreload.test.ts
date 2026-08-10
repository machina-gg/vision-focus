import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  storage: {
    get: vi.fn()
  }
}));

vi.mock('~/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/constants')>();
  return {
    ...actual,
    // chrome.runtime に依存するため差し替える
    getBackgroundUrl: vi.fn(
      (id: string) => `chrome-extension://test/${id}.webp`
    ),
    loadGoogleFont: vi.fn()
  };
});

import { storage } from '~/lib/storage';
import { getBackgroundUrl, loadGoogleFont } from '~/constants';
import { useBackgroundPreload } from '~/hooks/useBackgroundPreload';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';
import { STORAGE_LOADED_TIMEOUT_MS } from '~/constants/intervals';
import type { DashboardDisplaySettings } from '~/types/storage';

/** 画像プリロードを制御するための Image モック */
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = '';

  static instances: MockImage[] = [];

  constructor() {
    MockImage.instances.push(this);
  }

  set src(value: string) {
    this.#src = value;
  }

  get src() {
    return this.#src;
  }
}

const settings = (
  overrides: Partial<DashboardDisplaySettings> = {}
): DashboardDisplaySettings => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  ...overrides
});

beforeEach(() => {
  vi.clearAllMocks();
  MockImage.instances = [];
  vi.stubGlobal('Image', MockImage);
  vi.mocked(storage.get).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useBackgroundPreload', () => {
  describe('背景の解決', () => {
    it('backgroundImage の ID から URL を組み立てる', () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({ backgroundImage: 'monday' })
        })
      );

      expect(getBackgroundUrl).toHaveBeenCalledWith('monday');
      expect(result.current.backgroundUrl).toBe(
        'chrome-extension://test/monday.webp'
      );
    });

    it('backgroundImage が無い場合は default-1 にフォールバックする', () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({ backgroundImage: '' })
        })
      );

      expect(result.current.backgroundUrl).toBe(
        'chrome-extension://test/default-1.webp'
      );
    });

    it('カスタム背景データがある場合はそれを優先する', () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({
            customBackgroundData: 'data:image/png;base64,AAA',
            backgroundImage: 'monday'
          })
        })
      );

      expect(result.current.backgroundUrl).toBe('data:image/png;base64,AAA');
    });
  });

  describe('単色背景', () => {
    it('プリロードを待たずに即座に準備完了とする', () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({
            backgroundType: 'color',
            backgroundColor: '#123456'
          })
        })
      );

      expect(result.current.isColorBackground).toBe(true);
      expect(result.current.isBackgroundReady).toBe(true);
      // 画像の読み込みは発生しない
      expect(MockImage.instances).toHaveLength(0);
    });

    it('containerStyle に背景色を設定する', () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({
            backgroundType: 'color',
            backgroundColor: '#123456'
          })
        })
      );

      expect(result.current.containerStyle).toEqual({
        backgroundColor: '#123456'
      });
    });
  });

  describe('画像背景のプリロード', () => {
    it('読み込み完了までは暗色のプレースホルダを使う', () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({ displaySettings: settings() })
      );

      expect(result.current.isBackgroundReady).toBe(false);
      expect(result.current.containerStyle).toEqual({
        backgroundColor: '#1a1a2e'
      });
    });

    it('読み込み完了後に背景画像を適用する', async () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({ backgroundImage: 'monday' })
        })
      );

      await act(async () => {
        MockImage.instances[0].onload?.();
      });

      await waitFor(() => {
        expect(result.current.isBackgroundReady).toBe(true);
      });
      expect(result.current.containerStyle).toMatchObject({
        backgroundImage: 'url(chrome-extension://test/monday.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      });
    });

    it('読み込み失敗時も準備完了として扱う（表示を止めない）', async () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({ displaySettings: settings() })
      );

      await act(async () => {
        MockImage.instances[0].onerror?.();
      });

      await waitFor(() => {
        expect(result.current.isBackgroundReady).toBe(true);
      });
    });
  });

  describe('ストレージ読み込み判定', () => {
    it('vision が保存済みなら読み込み完了とする', async () => {
      vi.mocked(storage.get).mockResolvedValue({
        defaultSettings: DEFAULT_DISPLAY_SETTINGS,
        presets: [],
        activePresetId: null
      });

      const { result } = renderHook(() =>
        useBackgroundPreload({ displaySettings: settings() })
      );

      await waitFor(() => {
        expect(result.current.isStorageLoaded).toBe(true);
      });
      expect(storage.get).toHaveBeenCalledWith('vision');
    });

    it('vision が未保存でもタイムアウト後に読み込み完了とする（初回利用者向け）', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useBackgroundPreload({ displaySettings: settings() })
      );

      expect(result.current.isStorageLoaded).toBe(false);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(STORAGE_LOADED_TIMEOUT_MS);
      });

      expect(result.current.isStorageLoaded).toBe(true);
    });
  });

  describe('フォント', () => {
    it('フォント設定からスタイルを組み立てる', () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({
            fontSettings: { family: 'system', size: 'lg', weight: 'bold' }
          })
        })
      );

      expect(result.current.fontStyle).toMatchObject({
        fontSize: '48px'
      });
      expect(result.current.fontStyle.fontFamily).toBeTruthy();
      expect(result.current.fontStyle.fontWeight).toBeTruthy();
    });

    it('サイズ指定に応じて px が変わる', () => {
      const { result } = renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({
            fontSettings: { family: 'system', size: 'sm', weight: 'normal' }
          })
        })
      );

      expect(result.current.fontStyle.fontSize).toBe('30px');
    });

    it('システムフォントでは Google Fonts を読み込まない', () => {
      renderHook(() =>
        useBackgroundPreload({
          displaySettings: settings({
            fontSettings: { family: 'system', size: 'md', weight: 'bold' }
          })
        })
      );

      expect(loadGoogleFont).not.toHaveBeenCalled();
    });
  });
});
