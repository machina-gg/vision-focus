import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAnalytics } from '~/hooks/useAnalytics';
import { blockedSite, trackedSite, youtubeFeatures } from '~/test/sites';

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

  describe('handleReblock', () => {
    it('追跡だけのサイトはブロックリストに入れる', async () => {
      const { result } = renderHook(() => useAnalytics());
      await act(async () => {
        await result.current.handleReblock(trackedSite('x.com'));
      });
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledWith('add-block', {
        domain: 'x.com'
      });
    });

    it('無効にしたサイトはトグルを ON に戻す（時間制限を保ったまま）', async () => {
      const { result } = renderHook(() => useAnalytics());
      await act(async () => {
        await result.current.handleReblock(
          blockedSite('x.com', { enabled: false })
        );
      });
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledWith('toggle-block', {
        domain: 'x.com',
        enabled: true
      });
    });

    it('ブロック中のサイトには何も依頼しない', async () => {
      const { result } = renderHook(() => useAnalytics());
      await act(async () => {
        await result.current.handleReblock(blockedSite('x.com'));
      });
      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleStopTracking', () => {
    it('追跡だけのサイトは追跡の停止だけを依頼する', async () => {
      const { result } = renderHook(() => useAnalytics());
      await act(async () => {
        await result.current.handleStopTracking(trackedSite('x.com'));
      });
      expect(vi.mocked(sendMessage).mock.calls).toEqual([
        ['stop-tracking', { domain: 'x.com' }]
      ]);
    });

    it('無効にしたサイトはブロックリストから外してから追跡を止める', async () => {
      const { result } = renderHook(() => useAnalytics());
      await act(async () => {
        await result.current.handleStopTracking(
          blockedSite('x.com', { enabled: false })
        );
      });
      expect(vi.mocked(sendMessage).mock.calls).toEqual([
        ['remove-block', { domain: 'x.com' }],
        ['stop-tracking', { domain: 'x.com' }]
      ]);
    });

    it('ブロックリストから外せなければ追跡の停止を依頼しない', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAnalytics());
      await act(async () => {
        await result.current.handleStopTracking(
          blockedSite('x.com', { enabled: false })
        );
      });
      expect(vi.mocked(sendMessage).mock.calls).toEqual([
        ['remove-block', { domain: 'x.com' }]
      ]);
    });

    it('効いているブロックは外さない（解除の確認を通らずにブロックが外れるため）', async () => {
      const { result } = renderHook(() => useAnalytics());
      await act(async () => {
        await result.current.handleStopTracking(blockedSite('x.com'));
      });
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('YouTube 機能を持つサイトも依頼は送る（止めるかは background が決める）', async () => {
      const { result } = renderHook(() => useAnalytics());
      await act(async () => {
        await result.current.handleStopTracking(
          trackedSite('youtube.com', { youtube: youtubeFeatures() })
        );
      });
      expect(sendMessage).toHaveBeenCalledWith('stop-tracking', {
        domain: 'youtube.com'
      });
    });
  });

  describe('handleAddSiteToTrack', () => {
    it('追跡の追加を依頼し、成功したら true を返して理由を空にする', async () => {
      const { result } = renderHook(() => useAnalytics());
      let added = false;
      await act(async () => {
        added = await result.current.handleAddSiteToTrack('x.com');
      });
      expect(sendMessage).toHaveBeenCalledWith('add-tracked-site', {
        domain: 'x.com'
      });
      expect(added).toBe(true);
      expect(result.current.addSiteError).toBe('');
    });

    it('拒否されたらハンドラの理由を addSiteError に出して false を返す', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: 'm.x.com は追跡中の x.com に含まれるため追加できません'
      });
      const { result } = renderHook(() => useAnalytics());
      let added = true;
      await act(async () => {
        added = await result.current.handleAddSiteToTrack('m.x.com');
      });
      expect(added).toBe(false);
      expect(result.current.addSiteError).toBe(
        'm.x.com は追跡中の x.com に含まれるため追加できません'
      );

      // 次の追加が通れば理由は消える
      vi.mocked(sendMessage).mockResolvedValue({ success: true });
      await act(async () => {
        await result.current.handleAddSiteToTrack('y.com');
      });
      expect(result.current.addSiteError).toBe('');
    });

    it('依頼に失敗したら例外を投げず、失敗の理由を出す', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
      const { result } = renderHook(() => useAnalytics());
      let added = true;
      await act(async () => {
        added = await result.current.handleAddSiteToTrack('x.com');
      });
      expect(added).toBe(false);
      expect(result.current.addSiteError).not.toBe('');
    });
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

  it.each(['handleReblock', 'handleStopTracking'] as const)(
    '%s は依頼に失敗しても例外を画面へ投げない',
    async (name) => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
      const { result } = renderHook(() => useAnalytics());

      await expect(
        act(async () => {
          await result.current[name](trackedSite('x.com'));
        })
      ).resolves.not.toThrow();
    }
  );
});
