/**
 * 事実（ActivityLog）から画面に出す数値を導出する純粋関数。
 * 合計・ランキング・日別が同じ母集団（sites）と同じ期間（range）から出るよう、
 * 数値の集計はすべてここを通す。sites に無いキーの行はどの関数でも読み飛ばす
 */

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
  /** 今日いちばんブロックされたサイト。今日 1 回もブロックが無ければ null */
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

function parseDateKey(date: DateKey): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, SAFE_HOUR);
}

function addDays(date: DateKey, days: number): DateKey {
  const d = parseDateKey(date);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** 範囲内の日付を古い順に並べる。from > to なら空 */
function datesIn(range: DateRange): DateKey[] {
  const dates: DateKey[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    dates.push(d);
  }
  return dates;
}

/** 期間内・母集団内の行を 1 行ずつ渡す */
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

/** 期間内の合計 */
export function sumRange(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): ActivityTotals {
  const totals = emptyTotals();
  forEachRow(log, sites, range, (_date, _site, row) => addInto(totals, row));
  return totals;
}

/**
 * 期間内の指標でサイトを並べる（多い順。同値はドメインの昇順）。
 * 期間内に値が 0 のサイトは含めない
 */
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

/** 範囲内の日ごとの合計（古い順。事実の無い日も 0 で埋める） */
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

/** 範囲の初日からの累積秒（古い順） */
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

/** 1 サイトの期間内の合計 */
export function siteTotals(
  log: ActivityLog,
  site: SiteKey,
  range: DateRange
): ActivityTotals {
  return sumRange(log, [site], range);
}

/** 1 サイトのその日の表示秒数（時間制限の今日の使用量） */
export function secondsOnDay(
  log: ActivityLog,
  site: SiteKey,
  date: DateKey
): number {
  return log[date]?.[site]?.seconds ?? 0;
}

/** 指標が 1 以上だった最後の日 */
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

/** 最後にブロックを解除した日。解除したことが無ければ null */
export function lastUnblockedOn(
  log: ActivityLog,
  site: SiteKey
): DateKey | null {
  return lastDateWith(log, site, 'unblocks');
}

/** 最後にページが表示されていた日。表示されたことが無ければ null */
export function lastActiveOn(log: ActivityLog, site: SiteKey): DateKey | null {
  return lastDateWith(log, site, 'seconds');
}

/**
 * 最後に解除した日から today までの表示秒数。解除したことが無ければ 0。
 * 日単位で数えるので、解除した日の解除前の時間も入る
 */
export function secondsSinceUnblock(
  log: ActivityLog,
  site: SiteKey,
  today: DateKey
): number {
  const from = lastUnblockedOn(log, site);
  if (from === null) return 0;
  return siteTotals(log, site, { from, to: today }).seconds;
}

/** 今日の合計と、今日いちばんブロックされたサイト */
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

/** now を含む週（月曜〜日曜）。offset は 0 = 今週、-1 = 先週 */
export function weekRange(now: Date, offset: number): DateRange {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    SAFE_HOUR
  );
  // getDay は日曜 = 0。月曜を週の始まりにするため日曜は 6 日戻す
  const sinceMonday =
    (start.getDay() - MONDAY_INDEX + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  start.setDate(start.getDate() - sinceMonday + offset * DAYS_PER_WEEK);
  const from = toDateKey(start);
  return { from, to: addDays(from, DAYS_PER_WEEK - 1) };
}

/** now を含む月（1 日〜末日）。offset は 0 = 今月、-1 = 先月 */
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

/** 今日を含む直近 n 日（n が 1 未満なら空の範囲） */
export function lastNDaysRange(now: Date, n: number): DateRange {
  const to = toDateKey(now);
  return { from: addDays(to, 1 - n), to };
}
