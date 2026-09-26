import type { SiteKey } from './site';

/** ローカル時刻の日付（YYYY-MM-DD）。ローカルの 0 時で日が変わる */
export type DateKey = string;

/** 両端を含む日付の範囲 */
export interface DateRange {
  /** 範囲の最初の日 */
  from: DateKey;
  /** 範囲の最後の日 */
  to: DateKey;
}

/** 1 日・1 サイトぶんの事実 */
export interface DailySiteActivity {
  /** ページが表示されていた秒数 */
  seconds: number;
  /** ページへのアクセスがブロックされた回数 */
  blocks: number;
  /** 利用者がブロックを解除した回数 */
  unblocks: number;
}

/** 日付キー × サイトキー → その日の事実。活動の事実の置き場はここだけ */
export type ActivityLog = Record<DateKey, Record<SiteKey, DailySiteActivity>>;

/**
 * 事実の表の書き手に渡す出来事。
 * stay = 表示されていた秒数 / block = アクセスがブロックされた / unblock = 利用者がブロックを解除した。
 * site は出来事が起きたサイト、at は出来事の時刻（どの日に数えるかの判定に使う）
 */
export type ActivityEvent =
  | { kind: 'stay'; site: SiteKey; seconds: number; at: Date }
  | { kind: 'block'; site: SiteKey; at: Date }
  | { kind: 'unblock'; site: SiteKey; at: Date };
