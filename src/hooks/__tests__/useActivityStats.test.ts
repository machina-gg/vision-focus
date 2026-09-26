import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import {
  blockCountsByDomain,
  blockedHostTotals,
  retentionRange,
  todayStats,
  useActivitySources
} from '../useActivityStats';
import { toDateKey } from '~/lib/time';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import { DEFAULT_ACTIVITY, DEFAULT_SITES } from '~/types/storage';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';

/**
 * 画面が activity から数値を出すときの組み立ての検査。
 * 集計そのもの（sumRange / rankSites など）は activityStats の単体テストが見るので、
 * ここでは「どの期間・どの母集団・どのキーで引くか」を見る
 */

const storedValues = vi.hoisted(() => ({
  values: {} as Record<string, unknown>
}));

// 実物の項目は chrome.storage を読むため、キーで値を返すだけの形に差し替える
vi.mock('~/lib/storage', () => ({
  activityItem: { key: 'local:activity' },
  sitesItem: { key: 'local:sites' }
}));

vi.mock('../useStorageItem', () => ({
  useStorageItem: (item: { key: string }) => [
    storedValues.values[item.key],
    vi.fn()
  ]
}));

// 月末・年末をまたがない日を基準にし、日付の加減算の検査を 1 つに絞る
const NOW = new Date(2026, 5, 15, 10, 0, 0);
const TODAY = toDateKey(NOW);

function daysBefore(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}

function row(overrides: Partial<DailySiteActivity> = {}): DailySiteActivity {
  return { seconds: 0, blocks: 0, unblocks: 0, ...overrides };
}

describe('retentionRange', () => {
  it('daily-cleanup が残す最古の日（今日 - 保持日数）から今日まで', () => {
    expect(retentionRange(NOW)).toEqual({ from: daysBefore(365), to: TODAY });
  });
});

describe('todayStats', () => {
  it('今日の行だけを数え、トップのサイトとその今日の回数を返す', () => {
    const log: ActivityLog = {
      [TODAY]: {
        'a.com': row({ blocks: 2, seconds: 30, unblocks: 1 }),
        'b.com': row({ blocks: 3, seconds: 10 })
      },
      // 昨日の回数は多くても今日の順位に効かない
      [daysBefore(1)]: { 'a.com': row({ blocks: 50 }) }
    };

    expect(todayStats(log, ['a.com', 'b.com'], NOW)).toEqual({
      seconds: 40,
      blocks: 5,
      unblocks: 1,
      topBlockedSite: 'b.com',
      topBlockedCount: 3
    });
  });

  it('追跡中でないサイトの行は数えない', () => {
    const log: ActivityLog = {
      [TODAY]: { 'a.com': row({ blocks: 1 }), 'z.com': row({ blocks: 9 }) }
    };

    const stats = todayStats(log, ['a.com'], NOW);

    expect(stats.blocks).toBe(1);
    expect(stats.topBlockedSite).toBe('a.com');
  });

  it('今日のブロックが 0 件ならトップは null で回数は 0', () => {
    const log: ActivityLog = {
      [TODAY]: { 'a.com': row({ seconds: 120 }) },
      [daysBefore(1)]: { 'a.com': row({ blocks: 4 }) }
    };

    expect(todayStats(log, ['a.com'], NOW)).toEqual({
      seconds: 120,
      blocks: 0,
      unblocks: 0,
      topBlockedSite: null,
      topBlockedCount: 0
    });
  });
});

describe('blockedHostTotals', () => {
  const log: ActivityLog = {
    [TODAY]: { 'example.com': row({ blocks: 1, seconds: 60 }) },
    [daysBefore(365)]: { 'example.com': row({ blocks: 2, seconds: 30 }) },
    [daysBefore(366)]: { 'example.com': row({ blocks: 100, seconds: 999 }) }
  };

  it('サブドメインのホスト名を追跡中のサイトに引き直し、保持期間全体で合計する', () => {
    expect(
      blockedHostTotals(log, ['example.com'], 'm.example.com', NOW)
    ).toEqual({ seconds: 90, blocks: 3, unblocks: 0 });
  });

  it('どのサイトにも属さないホスト名はすべて 0', () => {
    expect(blockedHostTotals(log, ['example.com'], 'other.com', NOW)).toEqual({
      seconds: 0,
      blocks: 0,
      unblocks: 0
    });
  });
});

describe('blockCountsByDomain', () => {
  it('キーは項目の domain（サイトキー）で、値は保持期間全体のブロック回数', () => {
    const log: ActivityLog = {
      [TODAY]: { 'example.com': row({ blocks: 1 }) },
      [daysBefore(10)]: { 'example.com': row({ blocks: 2 }) },
      [daysBefore(400)]: { 'x.com': row({ blocks: 5 }) }
    };

    expect(
      blockCountsByDomain(
        log,
        [{ domain: 'example.com' }, { domain: 'x.com' }],
        NOW
      )
    ).toEqual({ 'example.com': 3, 'x.com': 0 });
  });
});

describe('useActivitySources', () => {
  it('保存値の activity と、追跡中のサイトのキーを返す（ブロック設定の有無を問わない）', () => {
    const activity: ActivityLog = {
      [TODAY]: { 'x.com': row({ blocks: 1 }) }
    };
    storedValues.values = {
      'local:activity': activity,
      'local:sites': sitesOf(
        blockedSite('x.com'),
        trackedSite('reddit.com'),
        trackedSite('youtube.com', { youtube: youtubeFeatures() })
      )
    };

    const { result } = renderHook(() => useActivitySources());

    expect(result.current.activity).toBe(activity);
    expect([...result.current.sites].sort()).toEqual([
      'reddit.com',
      'x.com',
      'youtube.com'
    ]);
  });

  it('何も保存されていなければ activity は空で、追跡中のサイトも無い', () => {
    storedValues.values = {
      'local:activity': DEFAULT_ACTIVITY,
      'local:sites': DEFAULT_SITES
    };

    const { result } = renderHook(() => useActivitySources());

    expect(result.current).toEqual({ activity: {}, sites: [] });
  });
});
