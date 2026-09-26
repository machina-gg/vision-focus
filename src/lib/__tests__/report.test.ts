import { describe, expect, it } from 'vitest';

import {
  generateWeeklyReport,
  generateMonthlyReport,
  formatWeekRange,
  formatMonth,
  REPORT_TOP_SITES_LIMIT
} from '~/lib/report';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';

function row(seconds: number, blocks = 0, unblocks = 0): DailySiteActivity {
  return { seconds, blocks, unblocks };
}

// 2024-06-12（水）。今週は 2024-06-10（月）〜 2024-06-16（日）
const NOW = new Date(2024, 5, 12, 12);

const sites = ['youtube.com', 'reddit.com', 'x.com'];

// 今週の外（前週・翌週・前月・翌月）の日と、母集団の外のサイト（untracked.com）を混ぜてある
const log: ActivityLog = {
  '2024-05-31': { 'youtube.com': row(1000, 1, 0) },
  '2024-06-03': { 'youtube.com': row(2000, 0, 0) },
  '2024-06-09': { 'youtube.com': row(5000, 9, 0) },
  '2024-06-10': {
    'youtube.com': row(1200, 2, 1),
    'reddit.com': row(600, 1, 0),
    'untracked.com': row(9999, 9, 9)
  },
  '2024-06-12': {
    'reddit.com': row(1800, 3, 0),
    'x.com': row(300, 0, 2)
  },
  '2024-06-16': { 'youtube.com': row(100, 0, 0) },
  '2024-06-17': { 'youtube.com': row(7777, 5, 0) },
  '2024-07-01': { 'youtube.com': row(3333, 3, 3) }
};

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

function present<T>(report: T | null): T {
  expect(report).not.toBeNull();
  if (report === null) throw new Error('report is null');
  return report;
}

describe('generateWeeklyReport', () => {
  it('週の合計 = 日別の合計 = 浪費サイトトップの合計（同じ期間・同じ母集団）', () => {
    const { totals, dailyBreakdown, topWasteSites } = present(
      generateWeeklyReport(log, sites, 0, NOW)
    );
    expect(totals).toEqual({ seconds: 4000, blocks: 6, unblocks: 3 });
    expect(sum(dailyBreakdown.map((d) => d.seconds))).toBe(totals.seconds);
    expect(sum(dailyBreakdown.map((d) => d.blocks))).toBe(totals.blocks);
    expect(sum(dailyBreakdown.map((d) => d.unblocks))).toBe(totals.unblocks);
    // 母集団のサイト数はトップの上限以下なので、トップが母集団全体を覆う
    expect(sites.length).toBeLessThanOrEqual(REPORT_TOP_SITES_LIMIT);
    expect(sum(topWasteSites.map((s) => s.value))).toBe(totals.seconds);
  });

  it('トップはその週の中で順位を付ける（前週・翌週の値に引っ張られない）', () => {
    const report = present(generateWeeklyReport(log, sites, 0, NOW));
    // youtube.com は前週・翌週に大きな値があるが、今週は reddit.com の方が多い
    expect(report.topWasteSites).toEqual([
      { domain: 'reddit.com', value: 2400 },
      { domain: 'youtube.com', value: 1300 },
      { domain: 'x.com', value: 300 }
    ]);
    expect(report.topBlockedSites).toEqual([
      { domain: 'reddit.com', value: 4 },
      { domain: 'youtube.com', value: 2 }
    ]);
    expect(report.topUnblockedSites).toEqual([
      { domain: 'x.com', value: 2 },
      { domain: 'youtube.com', value: 1 }
    ]);
  });

  it('週は月曜〜日曜の 7 日で、日別は事実の無い日も 0 で並ぶ', () => {
    const report = present(generateWeeklyReport(log, sites, 0, NOW));
    expect(report.weekStart).toBe('2024-06-10');
    expect(report.weekEnd).toBe('2024-06-16');
    expect(report.dailyBreakdown.map((d) => [d.date, d.seconds])).toEqual([
      ['2024-06-10', 1800],
      ['2024-06-11', 0],
      ['2024-06-12', 2100],
      ['2024-06-13', 0],
      ['2024-06-14', 0],
      ['2024-06-15', 0],
      ['2024-06-16', 100]
    ]);
  });

  it('前週比は前週の同じ母集団の合計と比べる', () => {
    const report = present(generateWeeklyReport(log, sites, 0, NOW));
    // 前週（06-03〜06-09）は 2000 + 5000
    expect(report.wasteTimeChangePercent).toBeCloseTo(
      ((4000 - 7000) / 7000) * 100
    );
  });

  it('前週の浪費時間が 0 なら前週比は null', () => {
    const report = present(
      generateWeeklyReport(
        { '2024-06-10': { 'youtube.com': row(100) } },
        sites,
        0,
        NOW
      )
    );
    expect(report.wasteTimeChangePercent).toBeNull();
  });

  it('傾向: 後半の浪費時間が減れば improving、増えれば declining、変わらなければ stable', () => {
    const improving = present(generateWeeklyReport(log, sites, 0, NOW));
    expect(improving.trend).toBe('improving');

    const declining = present(
      generateWeeklyReport(
        { '2024-06-16': { 'youtube.com': row(600) } },
        sites,
        0,
        NOW
      )
    );
    expect(declining.trend).toBe('declining');

    const stable = present(generateWeeklyReport({}, sites, 0, NOW));
    expect(stable.trend).toBe('stable');
  });

  it('offset -1 は前週。前週に事実があればレポートを返す', () => {
    const report = present(generateWeeklyReport(log, sites, -1, NOW));
    expect(report.weekStart).toBe('2024-06-03');
    expect(report.totals.seconds).toBe(7000);
  });

  it('事実の無い今週でも null を返さない（0 のレポート）', () => {
    const report = present(generateWeeklyReport({}, sites, 0, NOW));
    expect(report.totals).toEqual({ seconds: 0, blocks: 0, unblocks: 0 });
    expect(report.dailyBreakdown).toHaveLength(7);
  });

  it('事実の無い過去の週は null', () => {
    expect(generateWeeklyReport(log, sites, -3, NOW)).toBeNull();
  });

  it('母集団の外のサイトはどこにも入らない', () => {
    const report = present(
      generateWeeklyReport(log, ['untracked.com'], 0, NOW)
    );
    expect(report.totals.seconds).toBe(9999);
    const none = present(generateWeeklyReport(log, [], 0, NOW));
    expect(none.totals).toEqual({ seconds: 0, blocks: 0, unblocks: 0 });
    expect(none.topWasteSites).toEqual([]);
  });

  it('週の境界はローカルの 0 時（月曜 00:30 はその週、日曜 23:30 は前の週）', () => {
    const mondayJustAfterMidnight = new Date(2024, 5, 10, 0, 30);
    expect(
      present(generateWeeklyReport({}, sites, 0, mondayJustAfterMidnight))
        .weekStart
    ).toBe('2024-06-10');

    const sundayLateNight = new Date(2024, 5, 9, 23, 30);
    expect(
      present(generateWeeklyReport({}, sites, 0, sundayLateNight)).weekStart
    ).toBe('2024-06-03');
  });
});

describe('generateMonthlyReport', () => {
  it('月の合計 = 週別の合計 = 浪費サイトトップの合計（同じ期間・同じ母集団）', () => {
    const report = present(generateMonthlyReport(log, sites, 0, NOW));
    // 6 月の日: 06-03 / 06-09 / 06-10 / 06-12 / 06-16 / 06-17
    expect(report.totals.seconds).toBe(2000 + 5000 + 4000 + 7777);
    expect(sum(report.weeklyBreakdown.map((w) => w.seconds))).toBe(
      report.totals.seconds
    );
    expect(sum(report.weeklyBreakdown.map((w) => w.blocks))).toBe(
      report.totals.blocks
    );
    expect(sum(report.topWasteSites.map((s) => s.value))).toBe(
      report.totals.seconds
    );
  });

  it('週別は月の中の日だけを数え、月をまたぐ週は月の内側に切り詰める', () => {
    const report = present(generateMonthlyReport(log, sites, 0, NOW));
    // 2024-06-01 は土曜。最初の週は 06-01〜06-02 の 2 日だけ
    expect(report.weeklyBreakdown.map((w) => w.weekStart)).toEqual([
      '2024-06-01',
      '2024-06-03',
      '2024-06-10',
      '2024-06-17',
      '2024-06-24'
    ]);
  });

  it('月のキーは YYYY-MM', () => {
    expect(present(generateMonthlyReport(log, sites, 0, NOW)).month).toBe(
      '2024-06'
    );
    expect(present(generateMonthlyReport(log, sites, -1, NOW)).month).toBe(
      '2024-05'
    );
  });

  it('前月比は前月の同じ母集団の合計と比べる', () => {
    const report = present(generateMonthlyReport(log, sites, 0, NOW));
    expect(report.wasteTimeChangePercent).toBeCloseTo(
      ((report.totals.seconds - 1000) / 1000) * 100
    );
  });

  it('事実の無い今月でも null を返さず、事実の無い過去の月は null', () => {
    expect(generateMonthlyReport({}, sites, 0, NOW)).not.toBeNull();
    expect(generateMonthlyReport(log, sites, -3, NOW)).toBeNull();
  });
});

describe('formatWeekRange', () => {
  const shortMonth = (month: number) =>
    new Date(2024, month, 1).toLocaleDateString(undefined, { month: 'short' });

  it('同月の場合は月を 1 回だけ出す', () => {
    expect(formatWeekRange('2024-06-10', '2024-06-16')).toBe(
      `${shortMonth(5)} 10 - 16`
    );
  });

  it('月をまたぐ場合は両方の月を出す（日付キーはローカル日付として読む）', () => {
    expect(formatWeekRange('2024-06-28', '2024-07-04')).toBe(
      `${shortMonth(5)} 28 - ${shortMonth(6)} 4`
    );
  });
});

describe('formatMonth', () => {
  it('月キーから人間が読める月名を返す', () => {
    expect(formatMonth('2024-06')).toBe(
      new Date(2024, 5).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long'
      })
    );
  });
});
