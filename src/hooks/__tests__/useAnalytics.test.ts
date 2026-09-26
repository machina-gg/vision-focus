import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAnalytics } from '~/hooks/useAnalytics';

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  settingsItem: { setValue: vi.fn() },
  sitesItem: { setValue: vi.fn() },
  activityItem: { setValue: vi.fn(), removeValue: vi.fn() }
}));

import { sendMessage } from '~/lib/messaging';
import { activityItem, sitesItem } from '~/lib/storage';

/**
 * 分析タブの操作はどれも background へのメッセージで依頼する。
 * 追跡中のサイト・事実の表を画面から書くと、background の直列化を外れて変更が消える
 */
describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    expect(sitesItem.setValue).not.toHaveBeenCalled();
    expect(activityItem.setValue).not.toHaveBeenCalled();
    expect(activityItem.removeValue).not.toHaveBeenCalled();
  });

  it.each([
    ['handleReblock', 'add-block', { domain: 'x.com' }],
    ['handleStopTracking', 'stop-tracking', { domain: 'x.com' }],
    ['handleAddSiteToTrack', 'add-tracked-site', { domain: 'x.com' }]
  ] as const)('%s は %s を依頼する', async (name, message, data) => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current[name]('x.com');
    });

    expect(sendMessage).toHaveBeenCalledWith(message, data);
  });

  it('handleResetAnalytics は事実の表の消去を依頼する', async () => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.handleResetAnalytics();
    });

    expect(sendMessage).toHaveBeenCalledWith('reset-activity');
  });

  it('handleRefreshAnalytics は何も依頼しない（表示は保存値の監視で追従する）', async () => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.handleRefreshAnalytics();
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it.each([
    'handleReblock',
    'handleStopTracking',
    'handleAddSiteToTrack'
  ] as const)('%s は依頼に失敗しても例外を画面へ投げない', async (name) => {
    vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
    const { result } = renderHook(() => useAnalytics());

    await expect(
      act(async () => {
        await result.current[name]('x.com');
      })
    ).resolves.not.toThrow();
  });
});
