import type {
  ActivityTotals,
  DailyPoint,
  RankedSite
} from '~/lib/activityStats';
import type { DateKey } from './activity';

/** 期間の前半と後半の浪費時間の比較。improving = 後半に減った */
export type ReportTrend = 'improving' | 'declining' | 'stable';

/** 期間内の上位のサイト（値はその期間の中の合計） */
export interface ReportTopSites {
  /** 表示秒数の多い順 */
  topWasteSites: RankedSite[];
  /** ブロック回数の多い順 */
  topBlockedSites: RankedSite[];
  /** 解除回数の多い順 */
  topUnblockedSites: RankedSite[];
}

/** 月曜〜日曜の 1 週間のレポート */
export interface WeeklyReport extends ReportTopSites {
  /** 週の最初の日（月曜） */
  weekStart: DateKey;
  /** 週の最後の日（日曜） */
  weekEnd: DateKey;
  /** 週の合計（seconds が浪費時間） */
  totals: ActivityTotals;
  /** 週の 7 日分（事実の無い日も 0 で入る） */
  dailyBreakdown: DailyPoint[];
  /** 前週比（%）。前週が 0 なら null */
  wasteTimeChangePercent: number | null;
  /** 週の前半と後半の浪費時間の比較 */
  trend: ReportTrend;
}

/** 月の中の 1 週分の合計（月の外の日は含めない） */
interface WeeklyPoint extends ActivityTotals {
  /** 週の最初の日。月をまたぐ週は月の初日 */
  weekStart: DateKey;
}

/** 1 か月のレポート */
export interface MonthlyReport extends ReportTopSites {
  /** YYYY-MM */
  month: string;
  /** 月の合計（seconds が浪費時間） */
  totals: ActivityTotals;
  /** 月に含まれる週ごとの合計（古い順） */
  weeklyBreakdown: WeeklyPoint[];
  /** 前月比（%）。前月が 0 なら null */
  wasteTimeChangePercent: number | null;
  /** 月の前半と後半の浪費時間の比較 */
  trend: ReportTrend;
}
