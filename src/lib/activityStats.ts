import { MS_PER_DAY } from '~/constants/intervals';
import { toDateKey } from '~/lib/time';
import type {
  ActivityLog,
  DailySiteActivity,
  DateKey,
  DateRange
} from '~/types/activity';
import type { SiteKey } from '~/types/site';

/** 集計に使う指標（表示秒数・ブロック回数・解除回数のいずれか） */
export type ActivityMetric = keyof DailySiteActivity;

/** 指標ごとの合計 */
export interface ActivityTotals {
  /** ページが表示されていた秒数の合計 */
  seconds: number;
  /** ブロックが成立した回数の合計 */
  blocks: number;
  /** 利用者がブロックを解除した回数の合計 */
  unblocks: number;
}

/** rankSites の 1 行。value は指標の合計（秒か回数） */
export interface RankedSite {
  /** サイトキー */
  domain: SiteKey;
  /** 指標の合計（seconds なら秒、blocks / unblocks なら回数） */
  value: number;
}

/** dailySeries の 1 日ぶんの合計 */
export interface DailyPoint extends ActivityTotals {
  /** 集計した日（ローカル日付） */
  date: DateKey;
}

/** cumulativeSeries の 1 日ぶん。seconds は範囲の初日からの累積秒 */
export interface CumulativePoint {
  /** 集計した日（ローカル日付） */
  date: DateKey;
  /** 範囲の初日からこの日までの表示秒数の累積 */
  seconds: number;
}

/** 今日の合計と、今日いちばんブロックされたサイト（今日 1 回もブロックが無ければ null） */
export interface TodaySummary extends ActivityTotals {
  /** 今日のブロック回数が最も多いサイトキー（今日 1 回もブロックが無ければ null） */
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

/**
 * 日付キーを、ローカル日付でその日の正午の Date にする
 * @param date 日付キー（YYYY-MM-DD）
 * @returns その日のローカル時刻 12 時の Date
 */
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

/**
 * 期間内の行を合計する（sites に無いサイトの行は数えない）
 * @param log 活動の記録
 * @param sites 集計の対象にするサイトキー
 * @param range 集計する期間（両端を含む）
 * @returns 指標ごとの合計（該当する行が無ければすべて 0）
 */
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
 * 期間内の指標でサイトを多い順に並べ、上位 limit 件を返す（値が 0 のサイトは含めず、同値はドメイン順）
 * @param log 活動の記録
 * @param sites 並べる対象のサイトキー
 * @param range 集計する期間（両端を含む）
 * @param metric 並べる基準の指標
 * @param limit 返す最大件数（0 以下なら空）
 * @returns 指標の合計が多い順のサイト
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

/**
 * 範囲内の日ごとの合計を古い順に返す（記録の無い日も 0 で埋める）
 * @param log 活動の記録
 * @param sites 集計の対象にするサイトキー
 * @param range 集計する期間（両端を含む）
 * @returns 範囲の各日の合計（範囲の日数と同じ件数）
 */
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

/**
 * 範囲の初日からの累積秒を、日ごとに古い順で返す
 * @param log 活動の記録
 * @param sites 集計の対象にするサイトキー
 * @param range 集計する期間（両端を含む）
 * @returns 範囲の各日までの累積表示秒数
 */
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

/**
 * 1 サイトの期間内の合計
 * @param log 活動の記録
 * @param site 集計するサイトキー
 * @param range 集計する期間（両端を含む）
 * @returns 指標ごとの合計（記録が無ければすべて 0）
 */
export function siteTotals(
  log: ActivityLog,
  site: SiteKey,
  range: DateRange
): ActivityTotals {
  return sumRange(log, [site], range);
}

/**
 * 1 サイトがその日に表示されていた秒数（記録が無ければ 0）
 * @param log 活動の記録
 * @param site サイトキー
 * @param date ローカル日付の日付キー
 * @returns その日の表示秒数
 */
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

/**
 * 最後にブロックが成立した日。一度も無ければ null
 * @param log 活動の記録
 * @param site サイトキー
 * @returns ブロック回数が 1 以上の日のうち最も新しい日（無ければ null）
 */
export function lastBlockedOn(log: ActivityLog, site: SiteKey): DateKey | null {
  return lastDateWith(log, site, 'blocks');
}

/**
 * 最後にブロックを解除した日。一度も無ければ null
 * @param log 活動の記録
 * @param site サイトキー
 * @returns 解除回数が 1 以上の日のうち最も新しい日（無ければ null）
 */
export function lastUnblockedOn(
  log: ActivityLog,
  site: SiteKey
): DateKey | null {
  return lastDateWith(log, site, 'unblocks');
}

/**
 * 最後にページが表示されていた日。一度も無ければ null
 * @param log 活動の記録
 * @param site サイトキー
 * @returns 表示秒数が 1 以上の日のうち最も新しい日（無ければ null）
 */
export function lastActiveOn(log: ActivityLog, site: SiteKey): DateKey | null {
  return lastDateWith(log, site, 'seconds');
}

/**
 * 最後に解除した日から today までの表示秒数（日単位なので解除した日の解除前も含む。解除したことが無ければ 0）
 * @param log 活動の記録
 * @param site サイトキー
 * @param today 集計の終わりの日（ローカル日付。この日を含む）
 * @returns 解除した日から today までの表示秒数
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

/**
 * 複数サイトの secondsSinceUnblock の合計
 * @param log 活動の記録
 * @param sites 合計するサイトキー
 * @param today 集計の終わりの日（ローカル日付。この日を含む）
 * @returns 各サイトの解除後の表示秒数の合計
 */
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

/**
 * 今日の合計と、今日いちばんブロックされたサイトをまとめる
 * @param log 活動の記録
 * @param sites 集計の対象にするサイトキー
 * @param today 今日のローカル日付
 * @returns 今日の合計と最多ブロックのサイト
 */
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

/**
 * now を含む週（月曜〜日曜）の範囲。offset は週単位で 0 = 今週、-1 = 先週
 * @param now 基準の時刻（ローカル日付で週を決める）
 * @param offset 基準の週からずらす週数（負で過去）
 * @returns 月曜から日曜までの範囲
 */
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

/**
 * now を含む月（1 日〜末日）の範囲。offset は月単位で 0 = 今月、-1 = 先月
 * @param now 基準の時刻（ローカル日付で月を決める）
 * @param offset 基準の月からずらす月数（負で過去）
 * @returns 1 日から末日までの範囲
 */
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

/**
 * 今日を含む直近 n 日の範囲（n が 1 未満なら from が to より後の空の範囲）
 * @param now 基準の時刻（そのローカル日付が範囲の終わり）
 * @param n 範囲の日数
 * @returns n 日前の翌日から今日までの範囲
 */
export function lastNDaysRange(now: Date, n: number): DateRange {
  const to = toDateKey(now);
  return { from: addDays(to, 1 - n), to };
}

/**
 * range と重なる週（月曜〜日曜）を古い順に並べ、それぞれ range の内側に切り詰めて返す
 * @param range 分ける期間（from が to より後なら空）
 * @returns 週ごとの範囲（最初と最後の週は range の端で切れる）
 */
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

/**
 * from から to までの日数（同じ日なら 0、to が前なら負）
 * @param from 起点の日付キー
 * @param to 終点の日付キー
 * @returns 日数の差
 */
export function daysBetween(from: DateKey, to: DateKey): number {
  // 正午どうしの差なので、夏時間の切り替えで 1 時間ずれても丸めで吸収できる
  return Math.round(
    (parseDateKey(to).getTime() - parseDateKey(from).getTime()) / MS_PER_DAY
  );
}
