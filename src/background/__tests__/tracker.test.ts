import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn()
}));

vi.mock('~/lib/time', () => ({
  getTodayKey: vi.fn(() => '2026-08-11')
}));

import { getAnalytics, setAnalytics } from '~/lib/storage';
import { DEFAULT_ANALYTICS } from '~/types/storage';
import { TRACKING_UPDATE_INTERVAL_MS } from '~/constants/intervals';
import type { AnalyticsData } from '~/types/storage';

/**
 * tracker はモジュールレベルに活動中タブ・計測タイマーの状態を持つため、
 * テストごとに resetModules して読み込み直す。
 */
async function loadTracker() {
  vi.resetModules();
  return await import('../tracker');
}

/** chrome API のグローバルモックを構築する */
function setupChrome() {
  const listeners = {
    tabActivated: [] as ((info: chrome.tabs.TabActiveInfo) => void)[],
    tabUpdated: [] as ((
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => void)[],
    windowFocus: [] as ((windowId: number) => void)[]
  };

  const chromeMock = {
    runtime: { id: 'test-extension-id' },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      get: vi.fn().mockResolvedValue({ id: 2, url: 'https://other.com' }),
      onActivated: {
        addListener: vi.fn((fn) => listeners.tabActivated.push(fn)),
        removeListener: vi.fn()
      },
      onUpdated: {
        addListener: vi.fn((fn) => listeners.tabUpdated.push(fn)),
        removeListener: vi.fn()
      }
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged: {
        addListener: vi.fn((fn) => listeners.windowFocus.push(fn)),
        removeListener: vi.fn()
      }
    }
  };

  (globalThis as Record<string, unknown>).chrome = chromeMock;
  return { chromeMock, listeners };
}

/** setAnalytics に最後に渡された値を取得する */
function lastSaved(): AnalyticsData {
  const calls = vi.mocked(setAnalytics).mock.calls;
  return calls[calls.length - 1][0];
}

let harness: ReturnType<typeof setupChrome>;

beforeEach(() => {
  vi.clearAllMocks();
  harness = setupChrome();
  vi.mocked(getAnalytics).mockImplementation(async () => ({
    ...DEFAULT_ANALYTICS,
    siteTime: {},
    siteCategories: {},
    dailyStats: {}
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('tracker', () => {
  describe('getTodayStats', () => {
    it('当日の集計が無い場合は 0 埋めの値を返す', async () => {
      const { getTodayStats } = await loadTracker();

      const stats = await getTodayStats();

      expect(stats).toEqual({
        date: '2026-08-11',
        wasteTime: 0,
        investTime: 0,
        blockCount: 0,
        unblockCount: 0
      });
    });

    it('当日の集計があればそれを返す', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        dailyStats: {
          '2026-08-11': {
            date: '2026-08-11',
            wasteTime: 60,
            investTime: 120,
            blockCount: 3,
            unblockCount: 1
          }
        }
      });
      const { getTodayStats } = await loadTracker();

      const stats = await getTodayStats();

      expect(stats.wasteTime).toBe(60);
      expect(stats.blockCount).toBe(3);
    });
  });

  describe('incrementBlockCount', () => {
    it('当日のブロック回数を 1 増やす', async () => {
      const { incrementBlockCount } = await loadTracker();

      await incrementBlockCount();

      expect(lastSaved().dailyStats['2026-08-11']).toEqual({
        date: '2026-08-11',
        wasteTime: 0,
        investTime: 0,
        blockCount: 1,
        unblockCount: 0
      });
    });

    it('既存の集計値を保持したまま加算する', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        dailyStats: {
          '2026-08-11': {
            date: '2026-08-11',
            wasteTime: 60,
            investTime: 120,
            blockCount: 3,
            unblockCount: 2
          }
        }
      });
      const { incrementBlockCount } = await loadTracker();

      await incrementBlockCount();

      expect(lastSaved().dailyStats['2026-08-11']).toEqual({
        date: '2026-08-11',
        wasteTime: 60,
        investTime: 120,
        blockCount: 4,
        unblockCount: 2
      });
    });
  });

  describe('setSiteCategory', () => {
    it('ドメインのカテゴリを保存する', async () => {
      const { setSiteCategory } = await loadTracker();

      await setSiteCategory('example.com', 'invest');

      expect(lastSaved().siteCategories['example.com']).toBe('invest');
    });

    it('既存の計測データのカテゴリも更新する', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        siteTime: {
          'example.com': {
            domain: 'example.com',
            time: 300,
            category: 'neutral',
            lastUpdated: '2026-08-11T00:00:00.000Z'
          }
        },
        siteCategories: {}
      });
      const { setSiteCategory } = await loadTracker();

      await setSiteCategory('example.com', 'waste');

      expect(lastSaved().siteTime['example.com']).toMatchObject({
        time: 300,
        category: 'waste'
      });
    });

    it('計測データが無いドメインでもカテゴリだけ保存できる', async () => {
      const { setSiteCategory } = await loadTracker();

      await setSiteCategory('new.com', 'waste');

      expect(lastSaved().siteCategories['new.com']).toBe('waste');
      expect(lastSaved().siteTime['new.com']).toBeUndefined();
    });
  });

  describe('startTracking / stopTracking', () => {
    it('タブとウィンドウのイベントを購読し、現在のタブで初期化する', async () => {
      const { startTracking } = await loadTracker();

      startTracking();

      expect(
        harness.chromeMock.tabs.onActivated.addListener
      ).toHaveBeenCalled();
      expect(harness.chromeMock.tabs.onUpdated.addListener).toHaveBeenCalled();
      expect(
        harness.chromeMock.windows.onFocusChanged.addListener
      ).toHaveBeenCalled();
      expect(harness.chromeMock.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
    });

    it('stopTracking で購読を解除する', async () => {
      const { startTracking, stopTracking } = await loadTracker();

      startTracking();
      stopTracking();

      expect(
        harness.chromeMock.tabs.onActivated.removeListener
      ).toHaveBeenCalled();
      expect(
        harness.chromeMock.tabs.onUpdated.removeListener
      ).toHaveBeenCalled();
      expect(
        harness.chromeMock.windows.onFocusChanged.removeListener
      ).toHaveBeenCalled();
    });

    it('stopTracking 後は計測が行われない', async () => {
      vi.useFakeTimers();
      const { startTracking, stopTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      stopTracking();
      vi.mocked(setAnalytics).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 5);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('二重に startTracking しても計測が二重に走らない', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      vi.mocked(setAnalytics).mockClear();

      // 5 秒経過 → 1 回分の計測のみ（タイマーが 2 本走っていれば 2 回になる）
      await vi.advanceTimersByTimeAsync(5000);

      expect(vi.mocked(setAnalytics).mock.calls.length).toBeLessThanOrEqual(5);
    });
  });

  describe('滞在時間の記録', () => {
    it('経過秒数を対象ドメインに加算する', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-11T00:00:00.000Z'));
      const { startTracking } = await loadTracker();

      startTracking();
      // 初期化（chrome.tabs.query）の解決を待つ
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(3000);

      const saved = lastSaved();
      expect(saved.siteTime['example.com'].time).toBeGreaterThan(0);
    });

    it('カテゴリ未設定のドメインは neutral として扱い、浪費/投資に加算しない', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(3000);

      const saved = lastSaved();
      expect(saved.siteTime['example.com'].category).toBe('neutral');
      expect(saved.dailyStats['2026-08-11'].wasteTime).toBe(0);
      expect(saved.dailyStats['2026-08-11'].investTime).toBe(0);
    });

    it('waste カテゴリのドメインは浪費時間に加算する', async () => {
      vi.useFakeTimers();
      vi.mocked(getAnalytics).mockImplementation(async () => ({
        ...DEFAULT_ANALYTICS,
        siteTime: {},
        siteCategories: { 'example.com': 'waste' },
        dailyStats: {}
      }));
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(3000);

      const saved = lastSaved();
      expect(saved.dailyStats['2026-08-11'].wasteTime).toBeGreaterThan(0);
      expect(saved.dailyStats['2026-08-11'].investTime).toBe(0);
    });

    it('invest カテゴリのドメインは投資時間に加算する', async () => {
      vi.useFakeTimers();
      vi.mocked(getAnalytics).mockImplementation(async () => ({
        ...DEFAULT_ANALYTICS,
        siteTime: {},
        siteCategories: { 'example.com': 'invest' },
        dailyStats: {}
      }));
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(3000);

      const saved = lastSaved();
      expect(saved.dailyStats['2026-08-11'].investTime).toBeGreaterThan(0);
      expect(saved.dailyStats['2026-08-11'].wasteTime).toBe(0);
    });

    it('ドメインを特定できないタブでは計測しない', async () => {
      vi.useFakeTimers();
      harness.chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: undefined }
      ]);
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(5000);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('タブ取得が失敗しても例外を投げない', async () => {
      vi.useFakeTimers();
      harness.chromeMock.tabs.query.mockRejectedValue(new Error('no tabs'));
      const { startTracking } = await loadTracker();

      expect(() => startTracking()).not.toThrow();
      await vi.advanceTimersByTimeAsync(1000);

      expect(setAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('タブ切り替え', () => {
    it('タブ切り替え時に切り替え先のドメインを計測対象にする', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      // 別タブ（other.com）へ切り替え
      await harness.listeners.tabActivated[0]({
        tabId: 2,
        windowId: 1
      } as chrome.tabs.TabActiveInfo);
      await vi.advanceTimersByTimeAsync(3000);

      const saved = lastSaved();
      expect(saved.siteTime['other.com']).toBeDefined();
    });

    it('URL が取得できないタブへ切り替えた場合は計測を止める', async () => {
      vi.useFakeTimers();
      harness.chromeMock.tabs.get.mockResolvedValue({ id: 2, url: undefined });
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      await harness.listeners.tabActivated[0]({
        tabId: 2,
        windowId: 1
      } as chrome.tabs.TabActiveInfo);
      vi.mocked(setAnalytics).mockClear();
      await vi.advanceTimersByTimeAsync(5000);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('同一タブ内で URL が変わったら新しいドメインを計測する', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      await harness.listeners.tabUpdated[0](
        1,
        { url: 'https://changed.com/page' } as chrome.tabs.TabChangeInfo,
        {} as chrome.tabs.Tab
      );
      await vi.advanceTimersByTimeAsync(3000);

      expect(lastSaved().siteTime['changed.com']).toBeDefined();
    });

    it('アクティブでないタブの URL 変更は無視する', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      await harness.listeners.tabUpdated[0](
        999,
        { url: 'https://background.com' } as chrome.tabs.TabChangeInfo,
        {} as chrome.tabs.Tab
      );
      await vi.advanceTimersByTimeAsync(3000);

      expect(lastSaved().siteTime['background.com']).toBeUndefined();
    });

    it('URL 変更を伴わない更新イベントは無視する', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      vi.mocked(setAnalytics).mockClear();

      await harness.listeners.tabUpdated[0](
        1,
        { status: 'complete' } as chrome.tabs.TabChangeInfo,
        {} as chrome.tabs.Tab
      );

      // ドメインは変わらないため、この時点での保存は発生しない
      expect(setAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('ウィンドウのフォーカス', () => {
    it('フォーカスを失うと計測を停止する', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      await harness.listeners.windowFocus[0](-1); // WINDOW_ID_NONE
      vi.mocked(setAnalytics).mockClear();

      await vi.advanceTimersByTimeAsync(5000);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('フォーカスが戻ると現在のタブで計測を再開する', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await harness.listeners.windowFocus[0](-1);

      harness.chromeMock.tabs.query.mockClear();
      await harness.listeners.windowFocus[0](1);

      expect(harness.chromeMock.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });

      await vi.advanceTimersByTimeAsync(3000);
      expect(setAnalytics).toHaveBeenCalled();
    });
  });

  describe('拡張機能コンテキストが無効な場合', () => {
    it('イベントを受け取っても何もしない', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      // コンテキストを無効化する
      (globalThis as Record<string, unknown>).chrome = {
        ...harness.chromeMock,
        runtime: { id: undefined }
      };
      vi.mocked(setAnalytics).mockClear();

      await harness.listeners.tabActivated[0]({
        tabId: 2,
        windowId: 1
      } as chrome.tabs.TabActiveInfo);
      await vi.advanceTimersByTimeAsync(5000);

      expect(setAnalytics).not.toHaveBeenCalled();
    });
  });
});
