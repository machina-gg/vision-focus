// Report type definitions

import type { DailyStat } from './analytics';

// Weekly report (Premium)
export interface WeeklyReport {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  totalWasteTime: number; // seconds
  totalBlockCount: number;
  totalUnblockCount: number; // Total number of unblocks in the week
  dailyBreakdown: DailyStat[];
  dailyBlockCounts: number[];
  topWasteSites: { domain: string; time: number }[];
  topBlockedSites: { domain: string; count: number }[];
  topUnblockedSites: { domain: string; count: number }[]; // Sites with most unblock actions
  wasteTimeChangePercent: number | null; // null if no previous period data
  trend: 'improving' | 'declining' | 'stable';
}

// Monthly report (Premium)
export interface MonthlyReport {
  month: string; // YYYY-MM
  totalWasteTime: number; // seconds
  totalBlockCount: number;
  totalUnblockCount: number; // Total number of unblocks in the month
  weeklyBreakdown: {
    weekStart: string;
    wasteTime: number;
    blockCount: number;
    unblockCount: number; // Unblocks for this week
  }[];
  topWasteSites: { domain: string; time: number }[];
  topBlockedSites: { domain: string; count: number }[];
  topUnblockedSites: { domain: string; count: number }[]; // Sites with most unblock actions
  wasteTimeChangePercent: number | null; // null if no previous period data
  trend: 'improving' | 'declining' | 'stable';
}
