import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { invoke } from './handlers/helpers';

/**
 * 滞在時間の記録者が heartbeat の 1 本だけであることを、保存された値そのもので確かめる。
 *
 * 滞在時間は「表示されている時間」で、content script の heartbeat を受けた
 * `tracker-heartbeat` だけが事実の表（activity）の `stay` として書く。
 * 書き手が増えると同じ時間が二重に数えられ、実時間より多く記録される。
 *
 * ここでは書き手（activityService）と追跡中の集合（siteService）を実物のまま通し、
 * 保存領域だけをインメモリの実体に差し替えて「記録された合計 = 実時間」を検査する。
 */

const store = vi.hoisted(() => ({
  sites: undefined as unknown,
  activity: undefined as unknown
}));

vi.mock('~/lib/storage', () => ({
  getSites: vi.fn(async () => structuredClone(store.sites ?? {})),
  sitesItem: { setValue: vi.fn() },
  activityItem: {
    getValue: vi.fn(async () => structuredClone(store.activity ?? {})),
    setValue: vi.fn(async (value: unknown) => {
      store.activity = structuredClone(value);
    }),
    removeValue: vi.fn(async () => {
      store.activity = undefined;
    })
  }
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

import { sitesItem } from '~/lib/storage';
import { toDateKey } from '~/lib/time';
import { TRACKER_CONFIG } from '~/constants/limits';
import { sitesOf, trackedSite } from '~/test/sites';
import type { ActivityLog } from '~/types/activity';

const SITE = 'example.com';

/** 実時間としてシミュレートする長さ（記録間隔で割り切れる長さにする） */
const ELAPSED_MS = TRACKER_CONFIG.RECORDING_INTERVAL_MS * 12;
const ELAPSED_SECONDS = ELAPSED_MS / 1000;

const initialSites = sitesOf(trackedSite(SITE));

/** 今日の行に記録された滞在秒数（行が無ければ undefined） */
function todaySeconds(site: string): number | undefined {
  const log = store.activity as ActivityLog | undefined;
  return log?.[toDateKey(new Date())]?.[site]?.seconds;
}

/**
 * 表示中のページから heartbeat を送り続け、`durationMs` ぶんの実時間を流す。
 *
 * heartbeat は content script が一定間隔で送ってくる前提の仕組みなので、
 * 実機と同じく記録間隔ごとにメッセージを送り続ける（送らないと
 * HEARTBEAT_TIMEOUT_MS を超えて計測対象から外れる）。
 */
async function showPages(urls: readonly string[], durationMs = ELAPSED_MS) {
  vi.resetModules();
  const { trackerHeartbeatHandler } =
    await import('../handlers/tracker-heartbeat');

  for (const url of urls) {
    await invoke(trackerHeartbeatHandler, {
      url,
      status: 'active',
      timestamp: Date.now()
    });
  }

  const steps = Math.round(durationMs / TRACKER_CONFIG.RECORDING_INTERVAL_MS);
  for (let i = 0; i < steps; i++) {
    await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);
    for (const url of urls) {
      await invoke(trackerHeartbeatHandler, {
        url,
        status: 'heartbeat',
        timestamp: Date.now()
      });
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // 0 時をまたがない時刻にする（日付はローカル時刻で決まる）
  vi.setSystemTime(new Date(2026, 7, 11, 12, 0, 0));
  store.sites = structuredClone(initialSites);
  store.activity = undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('滞在時間の記録者は heartbeat の 1 本だけ', () => {
  it('表示されている間の滞在秒数は実時間の 1 倍で activity に残る', async () => {
    await showPages([`https://${SITE}/page`]);

    expect(todaySeconds(SITE)).toBe(ELAPSED_SECONDS);
  });

  it('同じサイトの別ホストを同時に表示していても実時間の 1 倍になる', async () => {
    await showPages([`https://${SITE}/a`, `https://www.${SITE}/b`]);

    expect(todaySeconds(SITE)).toBe(ELAPSED_SECONDS);
  });

  it('追跡中のサイト（設定）には書かない', async () => {
    // 解除後の時間は activity から導出する。設定側に足すと 2 つ目の記録者になる
    await showPages([`https://${SITE}/page`]);

    expect(sitesItem.setValue).not.toHaveBeenCalled();
    expect(store.sites).toEqual(initialSites);
  });

  it('追跡中でないサイトの滞在は記録しない', async () => {
    await showPages(['https://untracked.example.org/page']);

    expect(store.activity).toBeUndefined();
  });
});
