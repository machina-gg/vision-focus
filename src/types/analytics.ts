export type { TimeLimitType, TimeLimit } from './site';

export interface AnalyticsOptIn {
  enabled: boolean;
  decidedAt: string; // ISO8601
}
