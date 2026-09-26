import { MS_PER_DAY } from '~/constants/intervals';
import { toDateKey } from '~/lib/time';
import type {
  ActivityLog,
  DailySiteActivity,
  DateKey,
  DateRange
} from '~/types/activity';
import type { SiteKey } from '~/types/site';

export type ActivityMetric = keyof DailySiteActivity;

export interface ActivityTotals {
  seconds: number;
  blocks: number;
  unblocks: number;
}

export interface RankedSite {
  domain: SiteKey;
  value: number;
}

export interface DailyPoint extends ActivityTotals {
  date: DateKey;
}

export interface CumulativePoint {
  date: DateKey;
  seconds: number;
}

export interface TodaySummary extends ActivityTotals {
  topBlockedSite: SiteKey | null;
}

const DAYS_PER_WEEK = 7;
const MONDAY_INDEX = 1;
// 日付の加減算は正午で行う。0 時が存在しない日（夏時間の切り替え）でも日付がずれないため
const SAFE_HOUR = 12;

function emptyTotals(): ActivityTotals {
  return { seconds: 0, blocks: 0, unblocks: 0 };
}

function addInto(target: ActivityTotals, row: DailySiteActivity): void {
  target.seconds += row.seconds;
  target.blocks += row.blocks;
  target.unblocks += row.unblocks;
}

function isInRange(date: DateKey, range: DateRange): boolean {
  // YYYY-MM-DD は文字列の大小が日付の前後と一致する
  return date >= range.from && date <= range.to;
}

export function parseDateKey(date: DateKey): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, SAFE_HOUR);
}

function addDays(date: DateKey, days: number): DateKey {
  const d = parseDateKey(date);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

function datesIn(range: DateRange): DateKey[] {
  const dates: DateKey[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    dates.push(d);
  }
  return dates;
}

function forEachRow(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange,
  visit: (date: DateKey, site: SiteKey, row: DailySiteActivity) => void
): void {
  const population = new Set(sites);
  for (const [date, rows] of Object.entries(log)) {
    if (!isInRange(date, range)) continue;
    for (const [site, row] of Object.entries(rows)) {
      if (!population.has(site)) continue;
      visit(date, site, row);
    }
  }
}

export function sumRange(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): ActivityTotals {
  const totals = emptyTotals();
  forEachRow(log, sites, range, (_date, _site, row) => addInto(totals, row));
  return totals;
}

export function rankSites(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange,
  metric: ActivityMetric,
  limit: number
): RankedSite[] {
  const bySite = new Map<SiteKey, number>();
  forEachRow(log, sites, range, (_date, site, row) => {
    bySite.set(site, (bySite.get(site) ?? 0) + row[metric]);
  });
  return [...bySite.entries()]
    .filter(([, value]) => value > 0)
    .map(([domain, value]) => ({ domain, value }))
    .sort((a, b) => b.value - a.value || a.domain.localeCompare(b.domain))
    .slice(0, Math.max(0, limit));
}

export function dailySeries(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): DailyPoint[] {
  const byDate = new Map<DateKey, ActivityTotals>();
  forEachRow(log, sites, range, (date, _site, row) => {
    const totals = byDate.get(date) ?? emptyTotals();
    addInto(totals, row);
    byDate.set(date, totals);
  });
  return datesIn(range).map((date) => ({
    date,
    ...(byDate.get(date) ?? emptyTotals())
  }));
}

export function cumulativeSeries(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): CumulativePoint[] {
  let running = 0;
  return dailySeries(log, sites, range).map((point) => {
    running += point.seconds;
    return { date: point.date, seconds: running };
  });
}

export function siteTotals(
  log: ActivityLog,
  site: SiteKey,
  range: DateRange
): ActivityTotals {
  return sumRange(log, [site], range);
}

export function secondsOnDay(
  log: ActivityLog,
  site: SiteKey,
  date: DateKey
): number {
  return log[date]?.[site]?.seconds ?? 0;
}

function lastDateWith(
  log: ActivityLog,
  site: SiteKey,
  metric: ActivityMetric
): DateKey | null {
  let last: DateKey | null = null;
  for (const [date, rows] of Object.entries(log)) {
    if ((rows[site]?.[metric] ?? 0) <= 0) continue;
    if (last === null || date > last) last = date;
  }
  return last;
}

export function lastBlockedOn(log: ActivityLog, site: SiteKey): DateKey | null {
  return lastDateWith(log, site, 'blocks');
}

export function lastUnblockedOn(
  log: ActivityLog,
  site: SiteKey
): DateKey | null {
  return lastDateWith(log, site, 'unblocks');
}

export function lastActiveOn(log: ActivityLog, site: SiteKey): DateKey | null {
  return lastDateWith(log, site, 'seconds');
}

export function secondsSinceUnblock(
  log: ActivityLog,
  site: SiteKey,
  today: DateKey
): number {
  const from = lastUnblockedOn(log, site);
  if (from === null) return 0;
  return siteTotals(log, site, { from, to: today }).seconds;
}

export function totalSecondsSinceUnblock(
  log: ActivityLog,
  sites: readonly SiteKey[],
  today: DateKey
): number {
  return sites.reduce(
    (sum, site) => sum + secondsSinceUnblock(log, site, today),
    0
  );
}

export function todaySummary(
  log: ActivityLog,
  sites: readonly SiteKey[],
  today: DateKey
): TodaySummary {
  const range: DateRange = { from: today, to: today };
  const [top] = rankSites(log, sites, range, 'blocks', 1);
  return {
    ...sumRange(log, sites, range),
    topBlockedSite: top?.domain ?? null
  };
}

export function weekRange(now: Date, offset: number): DateRange {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    SAFE_HOUR
  );
  const sinceMonday =
    (start.getDay() - MONDAY_INDEX + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  start.setDate(start.getDate() - sinceMonday + offset * DAYS_PER_WEEK);
  const from = toDateKey(start);
  return { from, to: addDays(from, DAYS_PER_WEEK - 1) };
}

export function monthRange(now: Date, offset: number): DateRange {
  const first = new Date(
    now.getFullYear(),
    now.getMonth() + offset,
    1,
    SAFE_HOUR
  );
  // 翌月の 0 日 = その月の末日
  const last = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
    SAFE_HOUR
  );
  return { from: toDateKey(first), to: toDateKey(last) };
}

export function lastNDaysRange(now: Date, n: number): DateRange {
  const to = toDateKey(now);
  return { from: addDays(to, 1 - n), to };
}

export function weeksIn(range: DateRange): DateRange[] {
  const weeks: DateRange[] = [];
  if (range.from > range.to) return weeks;
  let week = weekRange(parseDateKey(range.from), 0);
  while (week.from <= range.to) {
    weeks.push({
      from: week.from < range.from ? range.from : week.from,
      to: week.to > range.to ? range.to : week.to
    });
    week = weekRange(parseDateKey(week.from), 1);
  }
  return weeks;
}

export function daysBetween(from: DateKey, to: DateKey): number {
  // 正午どうしの差なので、夏時間の切り替えで 1 時間ずれても丸めで吸収できる
  return Math.round(
    (parseDateKey(to).getTime() - parseDateKey(from).getTime()) / MS_PER_DAY
  );
}
