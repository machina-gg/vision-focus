import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

import { sendMessage } from '~/lib/messaging';
import { useBackgroundStats } from '~/hooks/useBackgroundStats';
import { DEFAULT_STATS_POLLING_MS } from '~/constants/intervals';

const stats = {
  wasteTime: 600,
  investTime: 1800,
  blockCount: 7,
  unblockCount: 2,
  topBlockedSite: { domain: 'x.com', count: 12 }
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendMessage).mockResolvedValue(stats);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBackgroundStats', () => {
  it('初期値はすべて 0 / null', () => {
    // 解決を遅延させて初期状態を観測する
    vi.mocked(sendMessage).mockReturnValue(new Promise<never>(() => {}));

    const { result } = renderHook(() => useBackgroundStats());

    expect(result.current).toEqual({
      wasteTime: 0,
      investTime: 0,
      blockCount: 0,
      unblockCount: 0,
      topBlockedSite: null
    });
  });

  it('background から取得した統計値を返す', async () => {
    const { result } = renderHook(() => useBackgroundStats());

    await waitFor(() => {
      expect(result.current).toEqual(stats);
    });
    expect(sendMessage).toHaveBeenCalledWith('get-stats');
  });

  it('取得に失敗しても例外を投げず初期値を保つ', async () => {
    vi.mocked(sendMessage).mockRejectedValue(new Error('no receiver'));

    const { result } = renderHook(() => useBackgroundStats());

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
    });
    expect(result.current.blockCount).toBe(0);
  });

  describe('ポーリング', () => {
    it('既定の間隔で再取得する', async () => {
      vi.useFakeTimers();

      renderHook(() => useBackgroundStats());

      await vi.advanceTimersByTimeAsync(0);
      expect(sendMessage).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(DEFAULT_STATS_POLLING_MS);
      expect(sendMessage).toHaveBeenCalledTimes(2);
    });

    it('指定した間隔で再取得する', async () => {
      vi.useFakeTimers();

      renderHook(() => useBackgroundStats(1000));

      await vi.advanceTimersByTimeAsync(0);
      expect(sendMessage).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(3000);
      expect(sendMessage).toHaveBeenCalledTimes(4);
    });

    it('アンマウント後は再取得しない', async () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useBackgroundStats(1000));

      await vi.advanceTimersByTimeAsync(0);
      unmount();
      vi.mocked(sendMessage).mockClear();

      await vi.advanceTimersByTimeAsync(5000);

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('間隔を変更するとタイマーを張り替える', async () => {
      vi.useFakeTimers();

      const { rerender } = renderHook(
        ({ interval }) => useBackgroundStats(interval),
        { initialProps: { interval: 1000 } }
      );

      await vi.advanceTimersByTimeAsync(0);
      expect(sendMessage).toHaveBeenCalledTimes(1);

      // 間隔変更で effect が再実行され、即時取得が 1 回走る
      rerender({ interval: 5000 });
      await vi.advanceTimersByTimeAsync(0);
      expect(sendMessage).toHaveBeenCalledTimes(2);

      // 旧間隔（1000ms）では発火しない
      vi.mocked(sendMessage).mockClear();
      await vi.advanceTimersByTimeAsync(1000);
      expect(sendMessage).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(4000);
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });
  });
});
