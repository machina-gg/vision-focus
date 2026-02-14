import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  generateWeeklyReport,
  generateMonthlyReport,
  formatWeekRange,
  formatMonth
} from '~/lib/report';
import type { AnalyticsData } from '~/types/storage';
import { DEFAULT_ANALYTICS } from '~/types/storage';

// 固定日時でテストするためにDateをモック
const FIXED_DATE = new Date('2024-06-12T12:00:00Z'); // 水曜日

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

// テスト用のAnalyticsDataを生成するヘルパー
function createAnalyticsData(
  overrides: Partial<AnalyticsData> = {}
): AnalyticsData {
  return {
    ...DEFAULT_ANALYTICS,
    ...overrides
  };
}

describe('generateWeeklyReport', () => {
  it('データなしの現在週でもnullを返さない', () => {
    const analytics = createAnalyticsData();
    const report = generateWeeklyReport(analytics, 0);
    expect(report).not.toBeNull();
  });

  it('データなしの過去週でnullを返す', () => {
    const analytics = createAnalyticsData();
    const report = generateWeeklyReport(analytics, -1);
    expect(report).toBeNull();
  });

  it('週の開始日と終了日が正しいフォーマットで返される', () => {
    const analytics = createAnalyticsData();
    const report = generateWeeklyReport(analytics, 0);
    expect(report).not.toBeNull();
    // YYYY-MM-DD形式で返される
    expect(report!.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(report!.weekEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // weekEndはweekStartより後の日付
    expect(report!.weekEnd > report!.weekStart).toBe(true);
  });

  it('dailyBreakdownが7日分返される', () => {
    const analytics = createAnalyticsData();
    const report = generateWeeklyReport(analytics, 0);
    expect(report!.dailyBreakdown).toHaveLength(7);
  });

  it('dailyBlockCountsが7日分返される', () => {
    const analytics = createAnalyticsData();
    const report = generateWeeklyReport(analytics, 0);
    expect(report!.dailyBlockCounts).toHaveLength(7);
  });

  it('日別統計データが正しく集計される', () => {
    const analytics = createAnalyticsData({
      dailyStats: {
        '2024-06-10': {
          date: '2024-06-10',
          wasteTime: 100,
          investTime: 200,
          blockCount: 5,
          unblockCount: 1
        },
        '2024-06-11': {
          date: '2024-06-11',
          wasteTime: 150,
          investTime: 300,
          blockCount: 3,
          unblockCount: 2
        }
      }
    });
    const report = generateWeeklyReport(analytics, 0);
    expect(report!.totalWasteTime).toBe(250);
    expect(report!.totalBlockCount).toBe(8);
    expect(report!.totalUnblockCount).toBe(3);
  });

  it('topWasteSitesが正しく返される', () => {
    const analytics = createAnalyticsData({
      siteTime: {
        'youtube.com': {
          domain: 'youtube.com',
          time: 500,
          category: 'waste',
          lastUpdated: '2024-06-12T00:00:00Z'
        },
        'twitter.com': {
          domain: 'twitter.com',
          time: 300,
          category: 'waste',
          lastUpdated: '2024-06-12T00:00:00Z'
        }
      }
    });
    const report = generateWeeklyReport(analytics, 0);
    expect(report!.topWasteSites).toHaveLength(2);
    expect(report!.topWasteSites[0].domain).toBe('youtube.com');
  });

  it('topBlockedSitesが正しくソートされる', () => {
    const analytics = createAnalyticsData({
      siteBlockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 10,
          lastBlocked: '2024-06-12T00:00:00Z'
        },
        'twitter.com': {
          domain: 'twitter.com',
          count: 20,
          lastBlocked: '2024-06-12T00:00:00Z'
        }
      }
    });
    const report = generateWeeklyReport(analytics, 0);
    expect(report!.topBlockedSites[0].domain).toBe('twitter.com');
    expect(report!.topBlockedSites[0].count).toBe(20);
  });

  it('topUnblockedSitesが正しく返される', () => {
    const analytics = createAnalyticsData({
      siteUnblockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 5,
          lastUnblocked: '2024-06-12T00:00:00Z'
        }
      }
    });
    const report = generateWeeklyReport(analytics, 0);
    expect(report!.topUnblockedSites).toHaveLength(1);
    expect(report!.topUnblockedSites[0].count).toBe(5);
  });

  it('wasteTimeChangePercentが前週との比較で計算される', () => {
    const analytics = createAnalyticsData({
      dailyStats: {
        // 前週（6/3〜6/9）
        '2024-06-03': {
          date: '2024-06-03',
          wasteTime: 100,
          investTime: 0,
          blockCount: 0,
          unblockCount: 0
        },
        // 今週（6/10〜6/16）
        '2024-06-10': {
          date: '2024-06-10',
          wasteTime: 200,
          investTime: 0,
          blockCount: 1,
          unblockCount: 0
        }
      }
    });
    const report = generateWeeklyReport(analytics, 0);
    // (200 - 100) / 100 * 100 = 100%
    expect(report!.wasteTimeChangePercent).toBe(100);
  });

  it('前週データがない場合wasteTimeChangePercentがnull', () => {
    const analytics = createAnalyticsData({
      dailyStats: {
        '2024-06-10': {
          date: '2024-06-10',
          wasteTime: 200,
          investTime: 0,
          blockCount: 1,
          unblockCount: 0
        }
      }
    });
    const report = generateWeeklyReport(analytics, 0);
    expect(report!.wasteTimeChangePercent).toBeNull();
  });

  it('trendがstable/improving/decliningを正しく判定する', () => {
    // 前半は多い、後半は少ない → improving
    const analytics = createAnalyticsData({
      dailyStats: {
        '2024-06-10': {
          date: '2024-06-10',
          wasteTime: 1000,
          investTime: 0,
          blockCount: 0,
          unblockCount: 0
        },
        '2024-06-11': {
          date: '2024-06-11',
          wasteTime: 1000,
          investTime: 0,
          blockCount: 0,
          unblockCount: 0
        },
        '2024-06-12': {
          date: '2024-06-12',
          wasteTime: 1000,
          investTime: 0,
          blockCount: 0,
          unblockCount: 0
        },
        '2024-06-14': {
          date: '2024-06-14',
          wasteTime: 10,
          investTime: 0,
          blockCount: 0,
          unblockCount: 0
        },
        '2024-06-15': {
          date: '2024-06-15',
          wasteTime: 10,
          investTime: 0,
          blockCount: 0,
          unblockCount: 0
        },
        '2024-06-16': {
          date: '2024-06-16',
          wasteTime: 10,
          investTime: 0,
          blockCount: 1,
          unblockCount: 0
        }
      }
    });
    const report = generateWeeklyReport(analytics, 0);
    expect(report!.trend).toBe('improving');
  });

  it('siteUnblockCountsがundefinedの場合でも動作する', () => {
    const analytics = createAnalyticsData();
    // siteUnblockCountsをundefined相当に
    (analytics as Record<string, unknown>).siteUnblockCounts = undefined;
    const report = generateWeeklyReport(analytics, 0);
    expect(report).not.toBeNull();
  });
});

describe('generateMonthlyReport', () => {
  it('データなしの現在月でもnullを返さない', () => {
    const analytics = createAnalyticsData();
    const report = generateMonthlyReport(analytics, 0);
    expect(report).not.toBeNull();
  });

  it('データなしの過去月でnullを返す', () => {
    const analytics = createAnalyticsData();
    const report = generateMonthlyReport(analytics, -1);
    expect(report).toBeNull();
  });

  it('月のキーが正しいフォーマット（YYYY-MM）', () => {
    const analytics = createAnalyticsData();
    const report = generateMonthlyReport(analytics, 0);
    // YYYY-MM形式であることを検証
    expect(report!.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('月の集計値が正しい', () => {
    const analytics = createAnalyticsData({
      dailyStats: {
        '2024-06-01': {
          date: '2024-06-01',
          wasteTime: 100,
          investTime: 50,
          blockCount: 5,
          unblockCount: 1
        },
        '2024-06-15': {
          date: '2024-06-15',
          wasteTime: 200,
          investTime: 100,
          blockCount: 10,
          unblockCount: 3
        }
      }
    });
    const report = generateMonthlyReport(analytics, 0);
    expect(report!.totalWasteTime).toBe(300);
    expect(report!.totalBlockCount).toBe(15);
    expect(report!.totalUnblockCount).toBe(4);
  });

  it('weeklyBreakdownが少なくとも4つ以上の要素を持つ', () => {
    const analytics = createAnalyticsData({
      dailyStats: {
        '2024-06-01': {
          date: '2024-06-01',
          wasteTime: 100,
          investTime: 0,
          blockCount: 1,
          unblockCount: 0
        }
      }
    });
    const report = generateMonthlyReport(analytics, 0);
    expect(report!.weeklyBreakdown.length).toBeGreaterThanOrEqual(4);
  });

  it('前月のwasteTimeChangePercentが計算される', () => {
    const analytics = createAnalyticsData({
      dailyStats: {
        // 前月（5月）
        '2024-05-15': {
          date: '2024-05-15',
          wasteTime: 500,
          investTime: 0,
          blockCount: 0,
          unblockCount: 0
        },
        // 今月（6月）
        '2024-06-15': {
          date: '2024-06-15',
          wasteTime: 250,
          investTime: 0,
          blockCount: 1,
          unblockCount: 0
        }
      }
    });
    const report = generateMonthlyReport(analytics, 0);
    // (250 - 500) / 500 * 100 = -50%
    expect(report!.wasteTimeChangePercent).toBe(-50);
  });

  it('topWasteSites/topBlockedSites/topUnblockedSitesが返される', () => {
    const analytics = createAnalyticsData({
      siteTime: {
        'youtube.com': {
          domain: 'youtube.com',
          time: 500,
          category: 'waste',
          lastUpdated: '2024-06-12T00:00:00Z'
        }
      },
      siteBlockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 10,
          lastBlocked: '2024-06-12T00:00:00Z'
        }
      },
      siteUnblockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 2,
          lastUnblocked: '2024-06-12T00:00:00Z'
        }
      }
    });
    const report = generateMonthlyReport(analytics, 0);
    expect(report!.topWasteSites).toHaveLength(1);
    expect(report!.topBlockedSites).toHaveLength(1);
    expect(report!.topUnblockedSites).toHaveLength(1);
  });
});

describe('formatWeekRange', () => {
  it('同月の場合は省略形式で表示', () => {
    const result = formatWeekRange('2024-06-10', '2024-06-16');
    // 同月なので「Jun 10 - 16」形式
    expect(result).toContain('10');
    expect(result).toContain('16');
  });

  it('月をまたぐ場合は両方の月を表示', () => {
    const result = formatWeekRange('2024-06-28', '2024-07-04');
    // 月をまたぐので両方の月名が含まれる
    expect(result).toContain('28');
    expect(result).toContain('4');
  });
});

describe('formatMonth', () => {
  it('月キーから人間が読める月名を返す', () => {
    const result = formatMonth('2024-06');
    // ロケールに依存するが、年と月が含まれる
    expect(result).toContain('2024');
  });

  it('異なる月も正しくフォーマット', () => {
    const result = formatMonth('2024-01');
    expect(result).toContain('2024');
  });
});
