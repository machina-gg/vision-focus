/**
 * CSV Export utilities
 */

import type {
  BlockItem,
  AnalyticsData,
  UnblockHistory,
  DailyStat
} from '~/types/storage';
import { formatTime } from './time';

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
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
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
 * Export all data to CSV (multiple files in a zip would be ideal, but for simplicity we'll do combined)
 */
export function exportAllData(
  blockList: BlockItem[],
  analyticsData: AnalyticsData,
  unblockHistory: UnblockHistory,
  isPremium: boolean
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

  // Premium-only: unblocked site time tracking
  if (isPremium && Object.keys(unblockHistory.sites || {}).length > 0) {
    exportUnblockedSites(unblockHistory);
  }
}
