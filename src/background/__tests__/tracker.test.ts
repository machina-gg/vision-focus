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

/**
 * chrome の Event を add / remove の意味論で模す。
 *
 * ⚠ addListener は同じ関数でも必ず積む。Chrome が同一参照を重複登録しない
 * かどうかに実装を依存させないため、モック側では畳まない
 * （畳むと「重ねて呼ぶとリスナーが増える」実装を見逃す）
 */
function makeEvent<T>(registered: T[]) {
  return {
    addListener: vi.fn((fn: T) => {
      registered.push(fn);
    }),
    removeListener: vi.fn((fn: T) => {
      const index = registered.indexOf(fn);
      if (index >= 0) registered.splice(index, 1);
    })
  };
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
      onActivated: makeEvent(listeners.tabActivated),
      onUpdated: makeEvent(listeners.tabUpdated)
    },
    windows: {
      WINDOW_ID_NONE: -1,
      // 既定はブラウザが前面にある状態
      getLastFocused: vi.fn().mockResolvedValue({ id: 1, focused: true }),
      onFocusChanged: makeEvent(listeners.windowFocus)
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

/** setAnalytics が一度も呼ばれていなければ null を返す */
function lastSavedOrNull(): AnalyticsData | null {
  const calls = vi.mocked(setAnalytics).mock.calls;
  return calls.length > 0 ? calls[calls.length - 1][0] : null;
}

/** 最後に保存された siteTime の合計秒数（未保存なら 0） */
function totalRecordedSeconds(): number {
  const saved = lastSavedOrNull();
  if (!saved) return 0;
  return Object.values(saved.siteTime).reduce(
    (sum, site) => sum + site.time,
    0
  );
}

/** 最後に保存された siteTime のドメイン一覧（未保存なら空） */
function recordedDomains(): string[] {
  return Object.keys(lastSavedOrNull()?.siteTime ?? {});
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
      // 初期化は非同期（フォーカス確認 → アクティブタブ取得）なので待つ
      await vi.waitFor(() => {
        expect(harness.chromeMock.windows.getLastFocused).toHaveBeenCalled();
        expect(harness.chromeMock.tabs.query).toHaveBeenCalledWith({
          active: true,
          currentWindow: true
        });
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

      // 書き出し間隔ぶん経過 → 1 回分の計測のみ（タイマーが 2 本走っていれば 2 回）
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      expect(vi.mocked(setAnalytics).mock.calls).toHaveLength(1);
    });

    it('何度 startTracking してもリスナーは 1 組しか残らない', async () => {
      // service worker が起きるたびに呼ばれるため、重複登録すると
      // 1 回のタブ切り替えが複数回処理される
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      for (let i = 0; i < 3; i++) {
        startTracking();
        await vi.advanceTimersByTimeAsync(0);
      }

      expect(harness.listeners.tabActivated).toHaveLength(1);
      expect(harness.listeners.tabUpdated).toHaveLength(1);
      expect(harness.listeners.windowFocus).toHaveLength(1);
    });

    it('何度 startTracking してもタイマーは 1 本しか残らない', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      for (let i = 0; i < 3; i++) {
        startTracking();
        await vi.advanceTimersByTimeAsync(0);
      }
      vi.mocked(setAnalytics).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      expect(vi.mocked(setAnalytics).mock.calls).toHaveLength(1);
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

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      // 書き出し間隔ぶんの秒数が、まとめて 1 回で加算される
      const saved = lastSaved();
      expect(saved.siteTime['example.com'].time).toBe(
        TRACKING_UPDATE_INTERVAL_MS / 1000
      );
    });

    it('カテゴリ未設定のドメインは neutral として扱い、浪費/投資に加算しない', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

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
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      const saved = lastSaved();
      expect(saved.dailyStats['2026-08-11'].wasteTime).toBe(
        TRACKING_UPDATE_INTERVAL_MS / 1000
      );
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
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      const saved = lastSaved();
      expect(saved.dailyStats['2026-08-11'].investTime).toBe(
        TRACKING_UPDATE_INTERVAL_MS / 1000
      );
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
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('タブ取得が失敗しても例外を投げない', async () => {
      vi.useFakeTimers();
      harness.chromeMock.tabs.query.mockRejectedValue(new Error('no tabs'));
      const { startTracking } = await loadTracker();

      expect(() => startTracking()).not.toThrow();
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

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
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

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
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

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
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

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
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

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
    it('ブラウザが前面でないときは計測を開始しない', async () => {
      // service worker は heartbeat 等で他アプリの使用中にも起こされる。
      // そのときアクティブタブを拾うと、見ていないサイトの時間が加算される
      vi.useFakeTimers();
      harness.chromeMock.windows.getLastFocused.mockResolvedValue({
        id: 1,
        focused: false
      });
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('ブラウザが前面でないときはアクティブタブを問い合わせない', async () => {
      vi.useFakeTimers();
      harness.chromeMock.windows.getLastFocused.mockResolvedValue({
        id: 1,
        focused: false
      });
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      expect(harness.chromeMock.tabs.query).not.toHaveBeenCalled();
    });

    it('ブラウザが前面なら計測を開始する', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      expect(lastSaved().siteTime['example.com'].time).toBe(
        TRACKING_UPDATE_INTERVAL_MS / 1000
      );
    });

    it('前面でなくなった後に起こされても、前のドメインの時間は伸びない', async () => {
      // 前面を離れた時点で activeDomain は消えるが、その後 service worker が
      // 起こされて初期化を通るときに古い値へ戻さないことを確かめる
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      harness.chromeMock.windows.getLastFocused.mockResolvedValue({
        id: 1,
        focused: false
      });

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      vi.mocked(setAnalytics).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('前面でなくなった後のタブ URL 変更では計測を再開しない', async () => {
      // レビューが示した経路（#440 / PR #451）:
      // フォーカス喪失 → heartbeat が時間制限超過を検知 → blockExistingTabs() が
      // chrome.tabs.update でブロック画面へ飛ばす → tabs.onUpdated が発火。
      // ここでフォーカスを見ないと、見ていない時間が加算され続ける
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      // ブラウザが前面でなくなる
      await harness.listeners.windowFocus[0](-1);
      vi.mocked(setAnalytics).mockClear();

      // ブロック画面へのリダイレクトが、直前までアクティブだったタブに届く
      await harness.listeners.tabUpdated[0](
        1,
        {
          url: 'chrome-extension://abcdef/blocked.html'
        } as chrome.tabs.TabChangeInfo,
        {} as chrome.tabs.Tab
      );

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('前面でなくなった後のタブ切り替えでは計測を再開しない', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      await harness.listeners.windowFocus[0](-1);
      vi.mocked(setAnalytics).mockClear();

      await harness.listeners.tabActivated[0]({
        tabId: 2,
        windowId: 1
      } as chrome.tabs.TabActiveInfo);

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('タブ切り替えの処理中にフォーカスを失っても計測しない', async () => {
      // ハンドラが chrome.tabs.get を待っている間にフォーカスが落ちると、
      // 入口の判定を通った後に activeDomain が設定される。
      // updateTracking 側の歯止めだけがこれを止める
      vi.useFakeTimers();
      let resolveGet: (tab: chrome.tabs.Tab) => void = () => {};
      harness.chromeMock.tabs.get.mockReturnValue(
        new Promise<chrome.tabs.Tab>((resolve) => {
          resolveGet = resolve;
        })
      );
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      // タブ切り替えを始める（chrome.tabs.get の解決待ちで止まる）
      const activated = harness.listeners.tabActivated[0]({
        tabId: 2,
        windowId: 1
      } as chrome.tabs.TabActiveInfo);
      await vi.advanceTimersByTimeAsync(0);

      // 待っている間にブラウザが前面でなくなる
      await harness.listeners.windowFocus[0](-1);

      // タブ取得が解決し、activeDomain が設定される
      resolveGet({ id: 2, url: 'https://other.com' } as chrome.tabs.Tab);
      await activated;
      vi.mocked(setAnalytics).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('前面でない間のタブ切り替えは、前面復帰後の記録に混ざらない', async () => {
      // 前面に戻ったときアクティブタブの URL が取れないと（chrome:// 等）、
      // initializeCurrentTab は activeDomain と lastUpdateTime を据え置く。
      // 前面でない間に入口の判定を抜けていると、不在中の時間が
      // そのまま加算されてしまう（updateTracking の歯止めでは止まらない）
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      await harness.listeners.windowFocus[0](-1);
      await harness.listeners.tabActivated[0]({
        tabId: 2,
        windowId: 1
      } as chrome.tabs.TabActiveInfo);

      // 見ていない時間が流れる
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      // 前面に戻るが、アクティブタブの URL は取れない
      harness.chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: undefined }
      ]);
      await harness.listeners.windowFocus[0](1);
      vi.mocked(setAnalytics).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('前面でない間の URL 変更は、前面復帰後の記録に混ざらない', async () => {
      // 上と同じ形で、tabs.onUpdated 側を検査する。
      // 前面復帰後は updateTracking の歯止めが効かないため、
      // 入口（activeTabId のクリアと handleTabUpdated の判定）だけが止められる
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      await harness.listeners.windowFocus[0](-1);

      // ブロック画面へのリダイレクトが、直前までアクティブだったタブに届く
      await harness.listeners.tabUpdated[0](
        1,
        {
          url: 'chrome-extension://abcdef/blocked.html'
        } as chrome.tabs.TabChangeInfo,
        {} as chrome.tabs.Tab
      );

      // 見ていない時間が流れる
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      // 前面に戻るが、アクティブタブの URL は取れない
      harness.chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: undefined }
      ]);
      await harness.listeners.windowFocus[0](1);
      vi.mocked(setAnalytics).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('タブ取得の解決が遅れても、失ったフォーカスの期間は記録されない', async () => {
      // レビューが示した経路（PR #451）:
      // (1) handleTabActivated が入口の判定を通り chrome.tabs.get を待つ
      // (2) 待っている間にフォーカスが落ち、計測対象が消える
      // (3) 解決した結果で activeDomain が復活する（再確認が無いと起きる）
      // (4) 前面でない間は updateTracking の歯止めで記録されない
      // (5) 前面に戻ってもアクティブタブの URL が取れないと上書きされない
      // (6) 次のティックで、不在期間まで含めて誤ったドメインに記録される
      vi.useFakeTimers();
      let resolveGet: (tab: chrome.tabs.Tab) => void = () => {};
      harness.chromeMock.tabs.get.mockReturnValue(
        new Promise<chrome.tabs.Tab>((resolve) => {
          resolveGet = resolve;
        })
      );
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      // (1) タブ切り替えを始める（chrome.tabs.get の解決待ちで止まる）
      const activated = harness.listeners.tabActivated[0]({
        tabId: 2,
        windowId: 1
      } as chrome.tabs.TabActiveInfo);
      await vi.advanceTimersByTimeAsync(0);

      // (2) 待っている間にブラウザが前面でなくなる
      await harness.listeners.windowFocus[0](-1);

      // (3) 遅れて解決する
      resolveGet({ id: 2, url: 'https://other.com' } as chrome.tabs.Tab);
      await activated;

      // (4) 前面でない間に時間が流れる
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      // (5) 前面に戻るが、アクティブタブの URL は取れない
      harness.chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: undefined }
      ]);
      await harness.listeners.windowFocus[0](1);

      // (6) 次のティック
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      // 記録された時間と記録先のドメインを同時に見る
      // （どちらが壊れても失敗時の差分に両方出る）
      expect({
        seconds: totalRecordedSeconds(),
        domains: recordedDomains()
      }).toEqual({ seconds: 0, domains: [] });
    });

    it('アクティブタブ取得の解決が遅れても、失ったフォーカスの期間は記録されない', async () => {
      // 上と同じ経路を initializeCurrentTab（chrome.tabs.query）側で再現する
      vi.useFakeTimers();
      let resolveQuery: (tabs: chrome.tabs.Tab[]) => void = () => {};
      harness.chromeMock.tabs.query
        .mockReturnValueOnce(
          new Promise<chrome.tabs.Tab[]>((resolve) => {
            resolveQuery = resolve;
          })
        )
        // 前面に戻ったときはアクティブタブの URL が取れない
        .mockResolvedValue([{ id: 1, url: undefined }]);
      const { startTracking } = await loadTracker();

      // (1) 起動時の初期化が chrome.tabs.query の解決待ちで止まる
      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      // (2) 待っている間にブラウザが前面でなくなる
      await harness.listeners.windowFocus[0](-1);

      // (3) 遅れて解決する
      resolveQuery([{ id: 5, url: 'https://leak.com' } as chrome.tabs.Tab]);
      await vi.advanceTimersByTimeAsync(0);

      // (4) 前面でない間に時間が流れる
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS * 3);

      // (5) 前面に戻る（URL が取れないので上書きされない）
      await harness.listeners.windowFocus[0](1);

      // (6) 次のティック
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      // 記録された時間と記録先のドメインを同時に見る
      // （どちらが壊れても失敗時の差分に両方出る）
      expect({
        seconds: totalRecordedSeconds(),
        domains: recordedDomains()
      }).toEqual({ seconds: 0, domains: [] });
    });

    it('フォーカスを失うと計測対象のタブも忘れる', async () => {
      // activeTabId が残ると、前面でない間の tabs.onUpdated が
      // 「アクティブタブの URL 変更」として通ってしまう
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);
      await harness.listeners.windowFocus[0](-1);

      // 前面に戻さないまま、同じタブの URL 変更を流す
      await harness.listeners.tabUpdated[0](
        1,
        { url: 'https://changed.com/page' } as chrome.tabs.TabChangeInfo,
        {} as chrome.tabs.Tab
      );
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      expect(lastSavedOrNull()?.siteTime['changed.com']).toBeUndefined();
    });

    it('フォーカスを失うと計測を停止する', async () => {
      vi.useFakeTimers();
      const { startTracking } = await loadTracker();

      startTracking();
      await vi.advanceTimersByTimeAsync(0);

      await harness.listeners.windowFocus[0](-1); // WINDOW_ID_NONE
      vi.mocked(setAnalytics).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

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

      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);
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
      await vi.advanceTimersByTimeAsync(TRACKING_UPDATE_INTERVAL_MS);

      expect(setAnalytics).not.toHaveBeenCalled();
    });
  });
});
