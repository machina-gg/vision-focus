import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useYouTubeSettings } from '~/hooks/useYouTubeSettings';
import type { YouTubeSettingsInput } from '~/types/messageSchemas';

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  settingsItem: { setValue: vi.fn() },
  sitesItem: { setValue: vi.fn() }
}));

import { sendMessage } from '~/lib/messaging';
import { settingsItem, sitesItem } from '~/lib/storage';
import { stubI18nWithLocale } from '~/test/i18n';

const value: YouTubeSettingsInput = {
  enabled: true,
  blockAccess: true,
  hideShorts: true,
  hideRecommendations: false,
  hideComments: false,
  hideHomeFeed: false,
  timeLimit: null
};

describe('useYouTubeSettings', () => {
  stubI18nWithLocale('ja');

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

  it('送信が例外を投げても外に伝播させず、汎用の失敗の文言を返す', async () => {
    vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
    const { result } = renderHook(() => useYouTubeSettings());

    let failure: string | null = null;
    await act(async () => {
      failure = await result.current.handleYouTubeChange(value);
    });

    expect(failure).toBe('操作できませんでした。もう一度お試しください');
  });

  it('パスワードを添えて依頼し、成功なら null を返す', async () => {
    const { result } = renderHook(() => useYouTubeSettings());

    let failure: string | null = 'unset';
    await act(async () => {
      failure = await result.current.handleYouTubeChange(value, 'secret');
    });

    expect(sendMessage).toHaveBeenCalledWith('update-youtube-settings', {
      youtube: value,
      password: 'secret'
    });
    expect(failure).toBeNull();
  });

  it('照合に失敗したら失敗の文言を返す', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      success: false,
      error: { code: 'password-required' }
    });
    const { result } = renderHook(() => useYouTubeSettings());

    let failure: string | null = null;
    await act(async () => {
      failure = await result.current.handleYouTubeChange(value);
    });

    expect(failure).toBe('パスワードが必要です');
  });
});
