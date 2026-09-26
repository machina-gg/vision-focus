/**
 * CSV Export utilities
 */

import type {
  BlockItem,
  AnalyticsData,
  UnblockHistory,
  DailyStat
} from '~/types/storage';
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
import type { SiteKey } from '~/types/site';
import { formatTime, toDateKey } from './time';

/**
 * Convert data to CSV string
 */
function toCSV(headers: string[], rows: string[][]): string {
  const escape = (value: string) => {
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map((row) => row.map(escape).join(','));

  return [headerLine, ...dataLines].join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(filename: string, content: string): void {
  // Add BOM for Excel compatibility with Japanese characters
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

/**
 * Get current date string for filename
 */
function getDateString(): string {
  // ファイル名の日付も画面と同じローカル日付にする
  return toDateKey(new Date());
}

/** 日付キーを表示用の日付にする。無ければ "-" */
function formatDateKey(date: DateKey | null): string {
  return date === null ? '-' : parseDateKey(date).toLocaleDateString();
}

/**
 * Export block list to CSV
 */
export function exportBlockList(blockList: BlockItem[]): void {
  const headers = ['Domain', 'Wildcard', 'Added Date'];
  const rows = blockList.map((item) => [
    item.domain,
    item.isWildcard ? 'Yes' : 'No',
    new Date(item.createdAt).toLocaleDateString()
  ]);

  const csv = toCSV(headers, rows);
  downloadCSV(`visionfocus-blocklist-${getDateString()}.csv`, csv);
}

/**
 * Export site block counts to CSV
 */
export function exportBlockCounts(
  siteBlockCounts: AnalyticsData['siteBlockCounts']
): void {
  const headers = ['Domain', 'Block Count', 'Last Blocked'];
  const counts = Object.values(siteBlockCounts || {});
  const rows = counts
    .sort((a, b) => b.count - a.count)
    .map((item) => [
      item.domain,
      String(item.count),
      item.lastBlocked ? new Date(item.lastBlocked).toLocaleDateString() : '-'
    ]);

  const csv = toCSV(headers, rows);
  downloadCSV(`visionfocus-block-counts-${getDateString()}.csv`, csv);
}

/**
 * Export daily stats to CSV
 */
export function exportDailyStats(dailyStats: Record<string, DailyStat>): void {
  const headers = ['Date', 'Waste Time', 'Block Count'];
  const rows = Object.entries(dailyStats)
    .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
    .map(([date, stat]) => [
      date,
      formatTime(stat.wasteTime),
      String(stat.blockCount)
    ]);

  const csv = toCSV(headers, rows);
  downloadCSV(`visionfocus-daily-stats-${getDateString()}.csv`, csv);
}

/**
 * Export unblocked site time tracking to CSV (Premium)
 */
export function exportUnblockedSites(unblockHistory: UnblockHistory): void {
  const headers = [
    'Domain',
    'Unblocked Date',
    'Time Since Unblock',
    'Last Activity'
  ];
  const rows = Object.values(unblockHistory.sites)
    .sort((a, b) => b.timeAfterUnblock - a.timeAfterUnblock)
    .map((site) => [
      site.domain,
      new Date(site.unblockedAt).toLocaleDateString(),
      formatTime(site.timeAfterUnblock),
      site.lastActivity ? new Date(site.lastActivity).toLocaleDateString() : '-'
    ]);

  const csv = toCSV(headers, rows);
  downloadCSV(`visionfocus-unblocked-sites-${getDateString()}.csv`, csv);
}

/**
 * サイト別ブロック回数の CSV の行（期間内の多い順。0 回のサイトは含めない）
 */
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

/** activity から出したサイト別ブロック回数を CSV でダウンロードする */
export function exportSiteBlockCounts(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): void {
  const headers = ['Domain', 'Block Count', 'Last Blocked'];
  const csv = toCSV(headers, blockCountRows(log, sites, range));
  downloadCSV(`visionfocus-block-counts-${getDateString()}.csv`, csv);
}

/**
 * 日別統計の CSV の行（新しい日から。浪費時間もブロックも解除も 0 の日は含めない）
 */
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

/** activity から出した日別統計を CSV でダウンロードする */
export function exportDailyActivity(
  log: ActivityLog,
  sites: readonly SiteKey[],
  range: DateRange
): void {
  const headers = ['Date', 'Waste Time', 'Block Count'];
  const csv = toCSV(headers, dailyActivityRows(log, sites, range));
  downloadCSV(`visionfocus-daily-stats-${getDateString()}.csv`, csv);
}

/**
 * 解除したサイトの CSV の行（解除後の時間の多い順。解除したことが無いサイトは含めない）
 */
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

/** activity から出した解除サイトの時間を CSV でダウンロードする */
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

/**
 * Export all data to CSV (multiple files in a zip would be ideal, but for simplicity we'll do combined)
 */
export function exportAllData(
  blockList: BlockItem[],
  analyticsData: AnalyticsData,
  unblockHistory: UnblockHistory
): void {
  // Export each type of data
  if (blockList.length > 0) {
    exportBlockList(blockList);
  }

  if (Object.keys(analyticsData.siteBlockCounts || {}).length > 0) {
    exportBlockCounts(analyticsData.siteBlockCounts);
  }

  if (Object.keys(analyticsData.dailyStats || {}).length > 0) {
    exportDailyStats(analyticsData.dailyStats);
  }

  if (Object.keys(unblockHistory.sites || {}).length > 0) {
    exportUnblockedSites(unblockHistory);
  }
}
