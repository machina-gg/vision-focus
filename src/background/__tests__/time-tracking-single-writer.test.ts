import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { invoke } from './handlers/helpers';

// 書き手が増えると同じ時間が二重に数えられるため、書き手と追跡中の集合を実物のまま通して「記録の合計 = 実時間」を見る
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

const ELAPSED_MS = TRACKER_CONFIG.RECORDING_INTERVAL_MS * 12;
const ELAPSED_SECONDS = ELAPSED_MS / 1000;

const initialSites = sitesOf(trackedSite(SITE));

function todaySeconds(site: string): number | undefined {
  const log = store.activity as ActivityLog | undefined;
  return log?.[toDateKey(new Date())]?.[site]?.seconds;
}

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
    await showPages([`https://${SITE}/page`]);

    expect(sitesItem.setValue).not.toHaveBeenCalled();
    expect(store.sites).toEqual(initialSites);
  });

  it('追跡中でないサイトの滞在は記録しない', async () => {
    await showPages(['https://untracked.example.org/page']);

    expect(store.activity).toBeUndefined();
  });
});
