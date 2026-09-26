// 週次・月次レポートの型。数値はすべて同じ期間・同じ母集団の activity から導出する

import type {
  ActivityTotals,
  DailyPoint,
  RankedSite
} from '~/lib/activityStats';
import type { DateKey } from './activity';

export type ReportTrend = 'improving' | 'declining' | 'stable';

/** 期間内のトップ（値はその期間の中の合計。期間外の日は数えない） */
export interface ReportTopSites {
  /** 表示秒数の多い順 */
  topWasteSites: RankedSite[];
  /** ブロック回数の多い順 */
  topBlockedSites: RankedSite[];
  /** 解除回数の多い順 */
  topUnblockedSites: RankedSite[];
}

export interface WeeklyReport extends ReportTopSites {
  weekStart: DateKey;
  weekEnd: DateKey;
  /** 週の合計（seconds が浪費時間） */
  totals: ActivityTotals;
  /** 月曜〜日曜の 7 日分（事実の無い日も 0 で入る） */
  dailyBreakdown: DailyPoint[];
  /** 前週比（%）。前週の浪費時間が 0 なら null */
  wasteTimeChangePercent: number | null;
  trend: ReportTrend;
}

/** 月の中の 1 週分（月の外の日は含めない） */
export interface WeeklyPoint extends ActivityTotals {
  weekStart: DateKey;
}

export interface MonthlyReport extends ReportTopSites {
  /** YYYY-MM */
  month: string;
  /** 月の合計（seconds が浪費時間） */
  totals: ActivityTotals;
  weeklyBreakdown: WeeklyPoint[];
  /** 前月比（%）。前月の浪費時間が 0 なら null */
  wasteTimeChangePercent: number | null;
  trend: ReportTrend;
}
