// Analytics-related type definitions

// 実体は site.ts。既存の import 元（~/types/analytics / ~/types/storage）を保つための再エクスポート
export type { TimeLimitType, TimeLimit } from './site';

// Tracked site - tracks sites from when they are blocked
export interface TrackedSite {
  domain: string;
  status: 'blocked' | 'unblocked'; // Current status
  blockedAt: string; // ISO8601 timestamp when added to blocklist
  unblockedAt: string | null; // ISO8601 timestamp when removed from blocklist (null if still blocked)
  timeAfterUnblock: number; // Cumulative time spent (seconds) after unblocking
  lastActivity: string | null; // ISO8601 timestamp of last activity
}

// Legacy alias for backwards compatibility
export type UnblockedSite = TrackedSite;

// History of unblocked sites
export interface UnblockHistory {
  sites: Record<string, UnblockedSite>; // key: domain
}

// Analytics opt-in settings (GA4)
export interface AnalyticsOptIn {
  enabled: boolean; // Whether anonymous usage stats are allowed
  decidedAt: string; // ISO8601 timestamp when user made the decision
}

// Default values
export const DEFAULT_UNBLOCK_HISTORY: UnblockHistory = {
  sites: {}
};
