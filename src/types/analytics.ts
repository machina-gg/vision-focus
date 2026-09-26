// Analytics-related type definitions

// 実体は site.ts。既存の import 元（~/types/analytics / ~/types/storage）を保つための再エクスポート
export type { TimeLimitType, TimeLimit } from './site';

// Analytics opt-in settings (GA4)
export interface AnalyticsOptIn {
  enabled: boolean; // Whether anonymous usage stats are allowed
  decidedAt: string; // ISO8601 timestamp when user made the decision
}
