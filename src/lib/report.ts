import {
  dailySeries,
  monthRange,
  parseDateKey,
  rankSites,
  sumRange,
  weekRange,
  weeksIn,
  type ActivityTotals
} from '~/lib/activityStats';
import type { ActivityLog, DateRange } from '~/types/activity';
import type {
  MonthlyReport,
  ReportTopSites,
  ReportTrend,
  WeeklyReport
} from '~/types/report';
import type { SiteKey } from '~/types/site';

/** レポートのトップに並べるサイトの数 */
export const REPORT_TOP_SITES_LIMIT = 5;

const TREND_THRESHOLD = 0.05;

const PERCENT = 100;

function topSites(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): ReportTopSites {
  return {
    topWasteSites: rankSites(
      log,
      sites,
      range,
      'seconds',
      REPORT_TOP_SITES_LIMIT
    ),
    topBlockedSites: rankSites(
      log,
      sites,
      range,
      'blocks',
      REPORT_TOP_SITES_LIMIT
    ),
    topUnblockedSites: rankSites(
      log,
      sites,
      range,
      'unblocks',
      REPORT_TOP_SITES_LIMIT
    )
  };
}

function isEmpty(totals: ActivityTotals): boolean {
  return totals.seconds === 0 && totals.blocks === 0;
}

function calculateTrend(seconds: number[]): ReportTrend {
  if (seconds.length < 2) return 'stable';

  const midpoint = Math.floor(seconds.length / 2);
  const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);
  const first = sum(seconds.slice(0, midpoint));
  const second = sum(seconds.slice(midpoint));
  const total = first + second;
  if (total === 0) return 'stable';

  const change = (second - first) / total;
  if (change < -TREND_THRESHOLD) return 'improving';
  if (change > TREND_THRESHOLD) return 'declining';
  return 'stable';
}

function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * PERCENT;
}

/** 週次レポート。weekOffset は 0 = 今週、-1 = 先週で、過去の週に記録が無ければ null */
export function generateWeeklyReport(
  log: ActivityLog,
  sites: readonly SiteKey[],
  weekOffset: number = 0,
  now: Date = new Date()
): WeeklyReport | null {
  const range = weekRange(now, weekOffset);
  const totals = sumRange(log, sites, range);
  if (weekOffset < 0 && isEmpty(totals)) return null;

  const dailyBreakdown = dailySeries(log, sites, range);
  const previous = sumRange(log, sites, weekRange(now, weekOffset - 1));

  return {
    weekStart: range.from,
    weekEnd: range.to,
    totals,
    dailyBreakdown,
    ...topSites(log, sites, range),
    wasteTimeChangePercent: changePercent(totals.seconds, previous.seconds),
    trend: calculateTrend(dailyBreakdown.map((d) => d.seconds))
  };
}

/** 月次レポート。monthOffset は 0 = 今月、-1 = 先月で、過去の月に記録が無ければ null */
export function generateMonthlyReport(
  log: ActivityLog,
  sites: readonly SiteKey[],
  monthOffset: number = 0,
  now: Date = new Date()
): MonthlyReport | null {
  const range = monthRange(now, monthOffset);
  const totals = sumRange(log, sites, range);
  if (monthOffset < 0 && isEmpty(totals)) return null;

  const weeklyBreakdown = weeksIn(range).map((week) => ({
    weekStart: week.from,
    ...sumRange(log, sites, week)
  }));
  const previous = sumRange(log, sites, monthRange(now, monthOffset - 1));

  return {
    month: range.from.slice(0, 7),
    totals,
    weeklyBreakdown,
    ...topSites(log, sites, range),
    wasteTimeChangePercent: changePercent(totals.seconds, previous.seconds),
    trend: calculateTrend(weeklyBreakdown.map((w) => w.seconds))
  };
}

/** 日付キー 2 つを週の範囲の表示（例: "Jun 10 - 16" / "Jun 24 - Jul 7"）にする */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = parseDateKey(weekStart);
  const end = parseDateKey(weekEnd);
  const startMonth = start.toLocaleDateString(undefined, { month: 'short' });
  const endMonth = end.toLocaleDateString(undefined, { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
}

/** YYYY-MM を表示用の月（例: "June 2024"）にする */
export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}
