// Analytics-related type definitions

// Daily statistics
export interface DailyStat {
  date: string; // YYYY-MM-DD
  wasteTime: number; // seconds
  investTime: number; // seconds
  blockCount: number;
  unblockCount: number; // Number of times sites were unblocked (toggle OFF)
}

// Site time tracking
export interface SiteTime {
  domain: string;
  time: number; // seconds
  category: 'waste' | 'invest' | 'neutral';
  lastUpdated: string;
}

// Site block count tracking (independent of blockList)
export interface SiteBlockCount {
  domain: string;
  count: number; // cumulative block count
  lastBlocked: string; // ISO8601 timestamp
}

// Site unblock count tracking (parallel to SiteBlockCount)
export interface SiteUnblockCount {
  domain: string;
  count: number; // cumulative unblock count
  lastUnblocked: string; // ISO8601 timestamp
}

// Time limit configuration for a site
export type TimeLimitType = 'daily' | 'hourly';

export interface TimeLimit {
  type: TimeLimitType;
  limitSeconds: number; // Limit in seconds (e.g., 1800 = 30 minutes)
}

// Time limit usage tracking for a domain
export interface TimeLimitUsage {
  domain: string;
  dailyUsedSeconds: number;
  hourlyUsedSeconds: number;
  lastDailyReset: string; // YYYY-MM-DD
  lastHourlyReset: string; // YYYY-MM-DD-HH
}

// Analytics data
export interface AnalyticsData {
  dailyStats: Record<string, DailyStat>; // key: YYYY-MM-DD
  siteTime: Record<string, SiteTime>; // key: domain
  siteCategories: Record<string, 'waste' | 'invest' | 'neutral'>; // key: domain
  siteBlockCounts: Record<string, SiteBlockCount>; // key: domain (persists even after removal from blockList)
  siteUnblockCounts: Record<string, SiteUnblockCount>; // key: domain (tracks unblock toggle-off actions)
  timeLimitUsage: Record<string, TimeLimitUsage>; // key: domain
}

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
export const DEFAULT_ANALYTICS: AnalyticsData = {
  dailyStats: {},
  siteTime: {},
  siteCategories: {},
  siteBlockCounts: {},
  siteUnblockCounts: {},
  timeLimitUsage: {}
};

export const DEFAULT_UNBLOCK_HISTORY: UnblockHistory = {
  sites: {}
};
