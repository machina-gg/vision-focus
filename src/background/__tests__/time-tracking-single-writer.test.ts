import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { invoke } from './handlers/helpers';

/**
 * 使用時間の記録者が 1 本だけであることを、2 つの経路を同時に動かして確かめる。
 *
 * 常時計測（src/background/tracker.ts）と heartbeat
 * （src/background/handlers/tracker-heartbeat.ts）は、どちらも
 * `extractDomain(url)` の結果をキーに analytics を書いていたため、
 * 同じサイトを前面にしている間は同一キーへ二重に加算されていた（#440）。
 *
 * ここでは storage をインメモリの実体に差し替え（モックの呼び出し回数ではなく
 * 保存された値そのものを見る）、両経路を同時に回して
 * 「記録された合計 = 実時間」になることを検査する。
 */

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn(),
  getUnblockHistory: vi.fn(),
  setUnblockHistory: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  getSiteBlockStatuses: vi.fn(async () => [])
}));

vi.mock('../notifications', () => ({
  checkTimeLimitNotification: vi.fn()
}));

vi.mock('../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

vi.mock('~/lib/time', () => ({
  getTodayKey: vi.fn(() => '2026-08-11')
}));

// 事実の表（activity）への記録はこの検査の対象外（旧データの記録者が 1 本であることを見る）
vi.mock('~/lib/activityService', () => ({
  recordActivity: vi.fn(),
  recordHostActivity: vi.fn()
}));

import {
  getSettings,
  getAnalytics,
  setAnalytics,
  getUnblockHistory,
  setUnblockHistory
} from '~/lib/storage';
import {
  DEFAULT_ANALYTICS,
  DEFAULT_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';
import type { AnalyticsData, UnblockHistory } from '~/types/storage';
import { TRACKER_CONFIG } from '~/constants/limits';
import { TRACKING_UPDATE_INTERVAL_MS } from '~/constants/intervals';

const TODAY_KEY = '2026-08-11';
const DOMAIN = 'example.com';
const PAGE_URL = `https://${DOMAIN}/page`;

/** 最小公倍数（両経路の記録間隔をどちらも割り切れる長さを作る） */
function lcm(a: number, b: number): number {
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  return (a / gcd(a, b)) * b;
}

/**
 * 実時間としてシミュレートする長さ。
 * 両経路の記録間隔の公倍数にして、どちらも端数を残さず書き出させる
 */
const ELAPSED_MS =
  lcm(TRACKING_UPDATE_INTERVAL_MS, TRACKER_CONFIG.RECORDING_INTERVAL_MS) * 4;
const ELAPSED_SECONDS = ELAPSED_MS / 1000;

/**
 * 集計データの書き込みで許す最短間隔。
 * ⚠ 実際の間隔を決めるのは TRACKING_UPDATE_INTERVAL_MS で、ここは下限の歯止め。
 * 間隔を定数から導く検査だけだと、毎秒書きへ戻しても期待値ごと動いて落ちない
 */
const MIN_WRITE_INTERVAL_MS = 5_000;

/** 書き込み頻度を測る窓（実時間 1 分） */
const FREQUENCY_WINDOW_MS = 60_000;

/** chrome.storage の代わりに使うインメモリの保存領域 */
interface Store {
  analytics: AnalyticsData;
  unblockHistory: UnblockHistory;
}

let store: Store;

/**
 * storage をインメモリの実体に差し替える。
 * 読み出し／書き戻しのたびに複製して、実ストレージと同じく
 * 「読んで書き換えて書き戻す」形になるようにする
 */
function givenStorage(category: 'waste' | 'invest' | 'neutral') {
  store = {
    analytics: {
      ...DEFAULT_ANALYTICS,
      siteTime: {},
      dailyStats: {},
      siteCategories: { [DOMAIN]: category }
    },
    unblockHistory: {
      ...DEFAULT_UNBLOCK_HISTORY,
      sites: {
        [DOMAIN]: {
          domain: DOMAIN,
          status: 'unblocked',
          blockedAt: '2026-01-01T00:00:00.000Z',
          unblockedAt: '2026-01-02T00:00:00.000Z',
          timeAfterUnblock: 0,
          lastActivity: null
        }
      }
    }
  };

  vi.mocked(getAnalytics).mockImplementation(async () =>
    structuredClone(store.analytics)
  );
  vi.mocked(setAnalytics).mockImplementation(async (value) => {
    store.analytics = structuredClone(value);
  });
  vi.mocked(getUnblockHistory).mockImplementation(async () =>
    structuredClone(store.unblockHistory)
  );
  vi.mocked(setUnblockHistory).mockImplementation(async (value) => {
    store.unblockHistory = structuredClone(value);
  });
  vi.mocked(getSettings).mockResolvedValue(structuredClone(DEFAULT_SETTINGS));
}

/** tracker が購読する chrome API をモックする */
function setupChrome() {
  (globalThis as Record<string, unknown>).chrome = {
    runtime: { id: 'test-extension-id' },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 1, url: PAGE_URL }]),
      get: vi.fn().mockResolvedValue({ id: 1, url: PAGE_URL }),
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() }
    },
    windows: {
      WINDOW_ID_NONE: -1,
      // ブラウザが前面にある状態（この前提でないと常時計測が始まらない）
      getLastFocused: vi.fn().mockResolvedValue({ id: 1, focused: true }),
      onFocusChanged: { addListener: vi.fn(), removeListener: vi.fn() }
    }
  };
}

/**
 * 常時計測と heartbeat を同時に動かし、ELAPSED_MS ぶんの実時間を流す。
 *
 * heartbeat は content script が一定間隔で送ってくる前提の仕組みなので、
 * 実機と同じく記録間隔ごとにメッセージを送り続ける（送らないと
 * HEARTBEAT_TIMEOUT_MS を超えて計測対象から外れる）。
 */
async function runBothTrackers(durationMs: number = ELAPSED_MS) {
  vi.resetModules();
  const { startTracking } = await import('../tracker');
  const { trackerHeartbeatHandler } =
    await import('../handlers/tracker-heartbeat');

  startTracking();
  // 初期化（chrome.tabs.query）の解決を待つ
  await vi.advanceTimersByTimeAsync(0);

  await invoke(trackerHeartbeatHandler, {
    url: PAGE_URL,
    status: 'active',
    timestamp: Date.now()
  });

  const steps = Math.round(durationMs / TRACKER_CONFIG.RECORDING_INTERVAL_MS);
  for (let i = 0; i < steps; i++) {
    await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);
    await invoke(trackerHeartbeatHandler, {
      url: PAGE_URL,
      status: 'heartbeat',
      timestamp: Date.now()
    });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY_KEY}T00:00:00.000Z`));
  setupChrome();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('使用時間の記録者は 1 本だけ（#440）', () => {
  it('両方の経路を同時に動かしても使用時間は実時間の 1 倍になる', async () => {
    givenStorage('neutral');

    await runBothTrackers();

    expect(store.analytics.siteTime[DOMAIN].time).toBe(ELAPSED_SECONDS);
  });

  it('waste に分類したサイトの浪費時間も実時間の 1 倍になる', async () => {
    givenStorage('waste');

    await runBothTrackers();

    expect(store.analytics.dailyStats[TODAY_KEY].wasteTime).toBe(
      ELAPSED_SECONDS
    );
    expect(store.analytics.dailyStats[TODAY_KEY].investTime).toBe(0);
  });

  it('invest に分類したサイトは浪費時間に入らない', async () => {
    // heartbeat 側は分類を見ずに waste へ入れていたため、同じ時間が
    // 浪費と投資の両方に計上されていた
    givenStorage('invest');

    await runBothTrackers();

    expect(store.analytics.dailyStats[TODAY_KEY].investTime).toBe(
      ELAPSED_SECONDS
    );
    expect(store.analytics.dailyStats[TODAY_KEY].wasteTime).toBe(0);
  });

  it('分類は上書き合戦にならず、設定したカテゴリのまま保たれる', async () => {
    // 2 経路が書いていた頃は後に書いた方が勝ち、どちらが後かは
    // タイマーの位相次第で決まらなかった
    givenStorage('invest');

    await runBothTrackers();

    expect(store.analytics.siteTime[DOMAIN].category).toBe('invest');
  });

  it('解除後の時間とサイト別の使用時間が食い違わない', async () => {
    // 同じ画面に並ぶ 2 つの数字。二重計上があると使用時間だけが 2 倍になる
    givenStorage('waste');

    await runBothTrackers();

    expect(store.unblockHistory.sites[DOMAIN].timeAfterUnblock).toBe(
      ELAPSED_SECONDS
    );
    expect(store.analytics.siteTime[DOMAIN].time).toBe(
      store.unblockHistory.sites[DOMAIN].timeAfterUnblock
    );
  });

  it('集計データの書き込みは書き出し間隔ごとに 1 回だけ走る', async () => {
    givenStorage('neutral');

    await runBothTrackers();

    expect(vi.mocked(setAnalytics).mock.calls).toHaveLength(
      ELAPSED_MS / TRACKING_UPDATE_INTERVAL_MS
    );
  });

  it('集計データの書き込みは最短間隔より頻繁に走らない', async () => {
    // 記録処理は集計データ全体を読み出して書き戻す。これが毎秒走ると
    // 書き込み量が蓄積量に比例して増え、Service Worker のアイドル停止も妨げる
    givenStorage('neutral');

    await runBothTrackers(FREQUENCY_WINDOW_MS);

    expect(vi.mocked(setAnalytics).mock.calls.length).toBeLessThanOrEqual(
      FREQUENCY_WINDOW_MS / MIN_WRITE_INTERVAL_MS
    );
  });
});
