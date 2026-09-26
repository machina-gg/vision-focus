export type { TimeLimitType, TimeLimit } from './site';

/** 利用状況の送信への同意 */
export interface AnalyticsOptIn {
  /** true = 送信に同意した */
  enabled: boolean;
  /** 同意・拒否を選んだ時刻（ISO8601） */
  decidedAt: string;
}
