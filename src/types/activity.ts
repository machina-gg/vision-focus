import type { SiteKey } from './site';

/** ローカル時刻の日付（YYYY-MM-DD）。ローカルの 0 時で日が変わる */
export type DateKey = string;

/** 両端を含む日付の範囲 */
export interface DateRange {
  from: DateKey;
  to: DateKey;
}

/** 1 日・1 サイトぶんの事実 */
export interface DailySiteActivity {
  /** ページが表示されていた秒数 */
  seconds: number;
  blocks: number;
  /** 利用者がブロックを解除した回数 */
  unblocks: number;
}

/** 日付キー × サイトキー → その日の事実。活動の事実の置き場はここだけ */
export type ActivityLog = Record<DateKey, Record<SiteKey, DailySiteActivity>>;

/** 事実の表の書き手に渡す出来事 */
export type ActivityEvent =
  | { kind: 'stay'; site: SiteKey; seconds: number; at: Date }
  | { kind: 'block'; site: SiteKey; at: Date }
  | { kind: 'unblock'; site: SiteKey; at: Date };
