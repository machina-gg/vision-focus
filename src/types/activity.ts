import type { SiteKey } from './site';

/** ローカル時刻の日付（YYYY-MM-DD）。ローカルの 0 時で日が変わる */
export type DateKey = string;

/** 両端を含む日付の範囲 */
export interface DateRange {
  from: DateKey;
  to: DateKey;
}

export interface DailySiteActivity {
  seconds: number;
  blocks: number;
  unblocks: number;
}

export type ActivityLog = Record<DateKey, Record<SiteKey, DailySiteActivity>>;

export type ActivityEvent =
  | { kind: 'stay'; site: SiteKey; seconds: number; at: Date }
  | { kind: 'block'; site: SiteKey; at: Date }
  | { kind: 'unblock'; site: SiteKey; at: Date };
