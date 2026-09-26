import { blockListSites } from '~/lib/blockList';
import {
  dailySeries,
  lastActiveOn,
  lastBlockedOn,
  lastUnblockedOn,
  parseDateKey,
  rankSites,
  secondsSinceUnblock
} from '~/lib/activityStats';
import type { ActivityLog, DateKey, DateRange } from '~/types/activity';
import type { SiteKey, TrackedSites } from '~/types/site';
import { formatTime, toDateKey } from './time';

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map((row) => row.map(escape).join(','));

  return [headerLine, ...dataLines].join('\n');
}

function downloadCSV(filename: string, content: string): void {
  // Excel が日本語を正しく読めるよう BOM を付ける
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function getDateString(): string {
  return toDateKey(new Date());
}

function formatDateKey(date: DateKey | null): string {
  return date === null ? '-' : parseDateKey(date).toLocaleDateString();
}

/** ブロックリスト CSV の行（ドメイン・追加日）。並びは blockListSites と同じ */
export function blockListRows(sites: TrackedSites): string[][] {
  return blockListSites(sites).map((site) => [
    site.domain,
    new Date(site.block.addedAt).toLocaleDateString()
  ]);
}

/** ブロックリストを CSV でダウンロードする */
export function exportBlockList(sites: TrackedSites): void {
  const headers = ['Domain', 'Added Date'];
  const csv = toCSV(headers, blockListRows(sites));
  downloadCSV(`visionfocus-blocklist-${getDateString()}.csv`, csv);
}

/** サイト別ブロック回数 CSV の行（ドメイン・回数・最後にブロックした日）。多い順で、0 回のサイトは含めない */
export function blockCountRows(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): string[][] {
  return rankSites(log, sites, range, 'blocks', sites.length).map(
    ({ domain, value }) => [
      domain,
      String(value),
      formatDateKey(lastBlockedOn(log, domain))
    ]
  );
}

/** 期間内のサイト別ブロック回数を CSV でダウンロードする */
export function exportSiteBlockCounts(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): void {
  const headers = ['Domain', 'Block Count', 'Last Blocked'];
  const csv = toCSV(headers, blockCountRows(log, sites, range));
  downloadCSV(`visionfocus-block-counts-${getDateString()}.csv`, csv);
}

/** 日別統計 CSV の行（日付・浪費時間・ブロック回数）。新しい日から並べ、記録が 0 の日は含めない */
export function dailyActivityRows(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): string[][] {
  return dailySeries(log, sites, range)
    .filter((day) => day.seconds > 0 || day.blocks > 0 || day.unblocks > 0)
    .reverse()
    .map((day) => [day.date, formatTime(day.seconds), String(day.blocks)]);
}

/** 期間内の日別統計を CSV でダウンロードする */
export function exportDailyActivity(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): void {
  const headers = ['Date', 'Waste Time', 'Block Count'];
  const csv = toCSV(headers, dailyActivityRows(log, sites, range));
  downloadCSV(`visionfocus-daily-stats-${getDateString()}.csv`, csv);
}

/** 解除したサイト CSV の行（ドメイン・解除日・解除後の時間・最終表示日）。解除後の時間の多い順で、解除したことが無いサイトは含めない */
export function unblockedSiteRows(
  log: ActivityLog,
  sites: readonly SiteKey[],
  today: DateKey
): string[][] {
  return sites
    .map((site) => ({
      site,
      unblockedOn: lastUnblockedOn(log, site),
      seconds: secondsSinceUnblock(log, site, today)
    }))
    .filter((row) => row.unblockedOn !== null)
    .sort((a, b) => b.seconds - a.seconds || a.site.localeCompare(b.site))
    .map((row) => [
      row.site,
      formatDateKey(row.unblockedOn),
      formatTime(row.seconds),
      formatDateKey(lastActiveOn(log, row.site))
    ]);
}

/** 解除したサイトごとの解除後の時間を CSV でダウンロードする */
export function exportUnblockedSiteTimes(
  log: ActivityLog,
  sites: readonly SiteKey[],
  today: DateKey
): void {
  const headers = [
    'Domain',
    'Unblocked Date',
    'Time Since Unblock',
    'Last Activity'
  ];
  const csv = toCSV(headers, unblockedSiteRows(log, sites, today));
  downloadCSV(`visionfocus-unblocked-sites-${getDateString()}.csv`, csv);
}
