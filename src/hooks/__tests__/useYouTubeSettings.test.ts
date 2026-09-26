import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useYouTubeSettings } from '~/hooks/useYouTubeSettings';
import type { AppSettings, YouTubeSettings } from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_YOUTUBE_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getUnblockHistory: vi.fn(),
  settingsItem: {
    setValue: vi.fn()
  },
  unblockHistoryItem: {
    setValue: vi.fn()
  }
}));

vi.mock('~/lib/youtubeBlockService', () => ({
  YOUTUBE_DOMAIN: 'youtube.com'
}));

import { sendMessage } from '~/lib/messaging';
import {
  getSettings,
  getUnblockHistory,
  settingsItem,
  unblockHistoryItem
} from '~/lib/storage';

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

  /** 保存済みの設定と追跡履歴を用意する */
  function givenStorage(stored: AppSettings) {
    vi.mocked(getSettings).mockResolvedValue(stored);
    vi.mocked(getUnblockHistory).mockResolvedValue(DEFAULT_UNBLOCK_HISTORY);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
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

    expect(sendMessage).toHaveBeenCalledWith('update-youtube-settings', {
      youtube: next
    });
    expect(settingsItem.setValue).not.toHaveBeenCalled();
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

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('保存に失敗したら画面の設定を更新しない', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
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
    vi.mocked(sendMessage).mockRejectedValue(new Error('no receiver'));
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

      expect(unblockHistoryItem.setValue).toHaveBeenCalledWith(
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

      expect(unblockHistoryItem.setValue).toHaveBeenCalledWith(
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

      expect(unblockHistoryItem.setValue).not.toHaveBeenCalled();
    });
  });
});
