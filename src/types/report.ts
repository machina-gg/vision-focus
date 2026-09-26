import type {
  ActivityTotals,
  DailyPoint,
  RankedSite
} from '~/lib/activityStats';
import type { DateKey } from './activity';

export type ReportTrend = 'improving' | 'declining' | 'stable';

export interface ReportTopSites {
  topWasteSites: RankedSite[];
  topBlockedSites: RankedSite[];
  topUnblockedSites: RankedSite[];
}

export interface WeeklyReport extends ReportTopSites {
  weekStart: DateKey;
  weekEnd: DateKey;
  totals: ActivityTotals;
  dailyBreakdown: DailyPoint[];
  /** 前週比（%）。前週が 0 なら null */
  wasteTimeChangePercent: number | null;
  trend: ReportTrend;
}

export interface WeeklyPoint extends ActivityTotals {
  weekStart: DateKey;
}

export interface MonthlyReport extends ReportTopSites {
  /** YYYY-MM */
  month: string;
  totals: ActivityTotals;
  weeklyBreakdown: WeeklyPoint[];
  /** 前月比（%）。前月が 0 なら null */
  wasteTimeChangePercent: number | null;
  trend: ReportTrend;
}
