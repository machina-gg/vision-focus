// Report type definitions

import type { DailyStat } from './storage';

// Weekly report (Premium)
export interface WeeklyReport {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  totalWasteTime: number; // seconds
  totalInvestTime: number; // seconds
  totalBlockCount: number;
  dailyBreakdown: DailyStat[];
  topWasteSites: { domain: string; time: number }[];
  topInvestSites: { domain: string; time: number }[];
  trend: 'improving' | 'declining' | 'stable';
}

// Monthly report (Premium)
export interface MonthlyReport {
  month: string; // YYYY-MM
  totalWasteTime: number; // seconds
  totalInvestTime: number; // seconds
  totalBlockCount: number;
  weeklyBreakdown: {
    weekStart: string;
    wasteTime: number;
    investTime: number;
  }[];
  topWasteSites: { domain: string; time: number }[];
  topInvestSites: { domain: string; time: number }[];
  trend: 'improving' | 'declining' | 'stable';
}
