import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useYouTubeSettings } from '~/hooks/useYouTubeSettings';
import type { AppSettings, YouTubeSettings } from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_YOUTUBE_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';

vi.mock('@plasmohq/messaging', () => ({
  sendToBackground: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock('~/lib/youtubeBlockService', () => ({
  YOUTUBE_DOMAIN: 'youtube.com',
  incrementYouTubeBlockCount: vi.fn()
}));

import { sendToBackground } from '@plasmohq/messaging';
import { storage } from '~/lib/storage';
import { incrementYouTubeBlockCount } from '~/lib/youtubeBlockService';

const youtube = (
  overrides: Partial<YouTubeSettings> = {}
): YouTubeSettings => ({
  ...DEFAULT_YOUTUBE_SETTINGS,
  ...overrides
});

const settings = (current: YouTubeSettings): AppSettings => ({
  ...DEFAULT_SETTINGS,
  youtube: current
});

describe('useYouTubeSettings', () => {
  const setSettings = vi.fn();

  /** storage.get のキーごとの戻り値を用意する */
  function givenStorage(stored: AppSettings) {
    vi.mocked(storage.get).mockImplementation(async (key: string) => {
      if (key === 'settings') return stored;
      if (key === 'unblockHistory') return DEFAULT_UNBLOCK_HISTORY;
      return undefined;
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendToBackground).mockResolvedValue({ success: true });
    givenStorage(settings(youtube()));
  });

  it('background のハンドラ経由で保存する（settings を直接書き込まない）', async () => {
    const next = youtube({ enabled: true, blockAccess: true });
    const { result } = renderHook(() =>
      useYouTubeSettings({ settings: settings(youtube()), setSettings })
    );

    await act(async () => {
      await result.current.handleYouTubeChange(next);
    });

    expect(sendToBackground).toHaveBeenCalledWith({
      name: 'update-youtube-settings',
      body: { youtube: next }
    });
    expect(storage.set).not.toHaveBeenCalledWith('settings', expect.anything());
  });

  it('保存後にストレージから読み直して画面の設定を更新する', async () => {
    const saved = settings(youtube({ enabled: true }));
    givenStorage(saved);
    const { result } = renderHook(() =>
      useYouTubeSettings({ settings: settings(youtube()), setSettings })
    );

    await act(async () => {
      await result.current.handleYouTubeChange(youtube({ enabled: true }));
    });

    expect(setSettings).toHaveBeenCalledWith(saved);
  });

  it('settings が未取得なら何もしない', async () => {
    const { result } = renderHook(() =>
      useYouTubeSettings({ settings: undefined, setSettings })
    );

    await act(async () => {
      await result.current.handleYouTubeChange(youtube({ enabled: true }));
    });

    expect(sendToBackground).not.toHaveBeenCalled();
  });

  it('保存に失敗したら画面の設定を更新しない', async () => {
    vi.mocked(sendToBackground).mockResolvedValue({
      success: false,
      error: 'Failed to update YouTube settings'
    });
    const { result } = renderHook(() =>
      useYouTubeSettings({ settings: settings(youtube()), setSettings })
    );

    await act(async () => {
      await result.current.handleYouTubeChange(youtube({ enabled: true }));
    });

    expect(setSettings).not.toHaveBeenCalled();
  });

  it('送信が例外を投げても外に伝播しない', async () => {
    vi.mocked(sendToBackground).mockRejectedValue(new Error('no receiver'));
    const { result } = renderHook(() =>
      useYouTubeSettings({ settings: settings(youtube()), setSettings })
    );

    await act(async () => {
      await expect(
        result.current.handleYouTubeChange(youtube({ enabled: true }))
      ).resolves.toBeUndefined();
    });

    expect(setSettings).not.toHaveBeenCalled();
  });

  describe('追跡履歴の記録', () => {
    it('YouTube ブロックを有効化したらブロック中として記録する', async () => {
      const { result } = renderHook(() =>
        useYouTubeSettings({
          settings: settings(youtube({ enabled: false })),
          setSettings
        })
      );

      await act(async () => {
        await result.current.handleYouTubeChange(youtube({ enabled: true }));
      });

      expect(incrementYouTubeBlockCount).toHaveBeenCalledOnce();
      expect(storage.set).toHaveBeenCalledWith(
        'unblockHistory',
        expect.objectContaining({
          sites: expect.objectContaining({
            'youtube.com': expect.objectContaining({ status: 'blocked' })
          })
        })
      );
    });

    it('YouTube ブロックを無効化したら解除として記録する', async () => {
      const { result } = renderHook(() =>
        useYouTubeSettings({
          settings: settings(youtube({ enabled: true })),
          setSettings
        })
      );

      await act(async () => {
        await result.current.handleYouTubeChange(youtube({ enabled: false }));
      });

      expect(incrementYouTubeBlockCount).not.toHaveBeenCalled();
      expect(storage.set).toHaveBeenCalledWith(
        'unblockHistory',
        expect.objectContaining({
          sites: expect.objectContaining({
            'youtube.com': expect.objectContaining({ status: 'unblocked' })
          })
        })
      );
    });

    it('有効・無効が変わらない変更では履歴を書き換えない', async () => {
      const { result } = renderHook(() =>
        useYouTubeSettings({
          settings: settings(youtube({ enabled: true })),
          setSettings
        })
      );

      await act(async () => {
        await result.current.handleYouTubeChange(
          youtube({ enabled: true, blockAccess: true })
        );
      });

      expect(incrementYouTubeBlockCount).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
    });
  });
});
