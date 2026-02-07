// Report type definitions

import type { DailyStat } from './storage';

// Weekly report (Premium)
export interface WeeklyReport {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  totalWasteTime: number; // seconds
  totalBlockCount: number;
  dailyBreakdown: DailyStat[];
  dailyBlockCounts: number[];
  topWasteSites: { domain: string; time: number }[];
  topBlockedSites: { domain: string; count: number }[];
  wasteTimeChangePercent: number | null; // null if no previous period data
  trend: 'improving' | 'declining' | 'stable';
}

// Monthly report (Premium)
export interface MonthlyReport {
  month: string; // YYYY-MM
  totalWasteTime: number; // seconds
  totalBlockCount: number;
  weeklyBreakdown: {
    weekStart: string;
    wasteTime: number;
    blockCount: number;
  }[];
  topWasteSites: { domain: string; time: number }[];
  topBlockedSites: { domain: string; count: number }[];
  wasteTimeChangePercent: number | null; // null if no previous period data
  trend: 'improving' | 'declining' | 'stable';
}
