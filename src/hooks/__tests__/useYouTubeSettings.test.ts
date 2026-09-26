import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useYouTubeSettings } from '~/hooks/useYouTubeSettings';
import type { YouTubeSectionValue } from '~/lib/siteSelectors';

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  settingsItem: { setValue: vi.fn() },
  sitesItem: { setValue: vi.fn() }
}));

import { sendMessage } from '~/lib/messaging';
import { settingsItem, sitesItem } from '~/lib/storage';

const value: YouTubeSectionValue = {
  enabled: true,
  blockAccess: true,
  hideShorts: true,
  hideRecommendations: false,
  hideComments: false,
  hideHomeFeed: false,
  timeLimit: null
};

describe('useYouTubeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
  });

  it('background のハンドラ経由で保存する（画面から保存領域には書かない）', async () => {
    const { result } = renderHook(() => useYouTubeSettings());

    await act(async () => {
      await result.current.handleYouTubeChange(value);
    });

    expect(sendMessage).toHaveBeenCalledWith('update-youtube-settings', {
      youtube: value
    });
    expect(settingsItem.setValue).not.toHaveBeenCalled();
    expect(sitesItem.setValue).not.toHaveBeenCalled();
  });

  it('送信が例外を投げても外に伝播しない', async () => {
    vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
    const { result } = renderHook(() => useYouTubeSettings());

    await expect(
      act(async () => {
        await result.current.handleYouTubeChange(value);
      })
    ).resolves.not.toThrow();
  });
});
