/**
 * TimeLimitService - Time Limit Check, Usage Calculation, and Reset
 *
 * This service handles all time-limit-related logic:
 * - Checking if time limits are exceeded
 * - Calculating remaining time
 * - Recording usage
 * - Resetting expired usage
 * - Providing time limit info for UI display
 *
 * Common internal functions are shared with youtubeBlockService
 * to avoid duplication.
 */

import { getAnalytics, setAnalytics } from '~/lib/storage';
import { extractDomain } from '~/lib/domain';
import { getTodayKey, needsDailyReset } from '~/lib/time';
import type {
  TimeLimitUsage,
  AnalyticsData,
  TimeLimit,
  TimeLimitType
} from '~/types/storage';
import { findEnabledBlockItemForDomain } from '~/lib/blockService';

// Time limit info for UI display
export interface TimeLimitInfo {
  hasTimeLimit: boolean;
  remainingSeconds: number | null;
  limitType: TimeLimitType | null;
  limitSeconds: number | null;
  usedSeconds: number | null;
  isExceeded: boolean;
}

/**
 * Get or create time limit usage for a domain
 * Shared internal helper used by both domain and YouTube time limit checks
 */
export function getOrCreateUsage(
  domain: string,
  analytics: AnalyticsData
): TimeLimitUsage {
  const existing = analytics.timeLimitUsage[domain];

  if (existing) {
    return existing;
  }

  return {
    domain,
    dailyUsedSeconds: 0,
    lastDailyReset: getTodayKey()
  };
}

/**
 * Apply resets to usage if needed and return the effective usage values
 * Shared internal helper used by both domain and YouTube time limit checks
 */
export function getEffectiveUsage(usage: TimeLimitUsage): {
  dailyUsedSeconds: number;
  wasReset: boolean;
} {
  let dailyUsedSeconds = usage.dailyUsedSeconds;
  let wasReset = false;

  if (needsDailyReset(usage.lastDailyReset)) {
    dailyUsedSeconds = 0;
    wasReset = true;
  }

  return { dailyUsedSeconds, wasReset };
}

/**
 * Common function to check if a time limit has been exceeded for a given domain
 * Used by both regular domain checks and YouTube checks
 */
export function checkTimeLimitExceeded(
  domain: string,
  timeLimitConfig: TimeLimit,
  analytics: AnalyticsData
): boolean {
  const usage = getOrCreateUsage(domain, analytics);
  const effective = getEffectiveUsage(usage);

  const { limitSeconds } = timeLimitConfig;
  const usedSeconds = effective.dailyUsedSeconds;

  // 制限時間を超えた場合のみブロック（制限時間ちょうどはブロックしない）
  return usedSeconds > limitSeconds;
}

/**
 * Common function to calculate remaining time for a given domain
 * Used by both regular domain checks and YouTube checks
 */
export function calculateRemainingTime(
  domain: string,
  timeLimitConfig: TimeLimit,
  analytics: AnalyticsData
): number {
  const usage = getOrCreateUsage(domain, analytics);
  const effective = getEffectiveUsage(usage);

  const { limitSeconds } = timeLimitConfig;
  const usedSeconds = effective.dailyUsedSeconds;

  return Math.max(0, limitSeconds - usedSeconds);
}

/**
 * Check if a domain has exceeded its time limit
 */
export async function hasExceededTimeLimit(
  domain: string,
  blockItem?: import('~/types/storage').BlockItem | null
): Promise<boolean> {
  const item = blockItem ?? (await findEnabledBlockItemForDomain(domain));

  if (!item) {
    return false;
  }

  if (!item.timeLimit) {
    // No time limit configured - always blocked when enabled
    return true;
  }

  const analytics = await getAnalytics();
  return checkTimeLimitExceeded(domain, item.timeLimit, analytics);
}

/**
 * Get remaining time in seconds for a domain
 * Returns null if no time limit is set
 */
export async function getRemainingTime(
  domain: string,
  blockItem?: import('~/types/storage').BlockItem | null
): Promise<number | null> {
  const item = blockItem ?? (await findEnabledBlockItemForDomain(domain));

  if (!item || !item.timeLimit) {
    return null;
  }

  const analytics = await getAnalytics();
  return calculateRemainingTime(domain, item.timeLimit, analytics);
}

/**
 * Record time usage for a domain
 */
export async function recordTimeLimitUsage(
  domain: string,
  seconds: number
): Promise<void> {
  if (seconds <= 0) return;

  const blockItem = await findEnabledBlockItemForDomain(domain);

  if (!blockItem || !blockItem.timeLimit) {
    return;
  }

  const analytics = await getAnalytics();
  const usage = analytics.timeLimitUsage[domain] || {
    domain,
    dailyUsedSeconds: 0,
    lastDailyReset: getTodayKey()
  };

  const todayKey = getTodayKey();

  // Check and apply daily reset
  if (needsDailyReset(usage.lastDailyReset)) {
    usage.dailyUsedSeconds = 0;
    usage.lastDailyReset = todayKey;
  }

  // Add the time
  usage.dailyUsedSeconds += seconds;

  // Save
  analytics.timeLimitUsage[domain] = usage;
  await setAnalytics(analytics);
}

/**
 * Reset expired usage entries (called periodically by alarm)
 */
export async function resetExpiredUsage(): Promise<void> {
  const analytics = await getAnalytics();
  const todayKey = getTodayKey();
  let updated = false;

  for (const domain of Object.keys(analytics.timeLimitUsage)) {
    const usage = analytics.timeLimitUsage[domain];

    if (needsDailyReset(usage.lastDailyReset)) {
      usage.dailyUsedSeconds = 0;
      usage.lastDailyReset = todayKey;
      updated = true;
    }
  }

  if (updated) {
    await setAnalytics(analytics);
  }
}

/**
 * Get time limit info for a URL (used by popup/newtab)
 */
export async function getTimeLimitInfo(
  url: string
): Promise<TimeLimitInfo | null> {
  const domain = extractDomain(url);
  if (!domain) return null;

  const blockItem = await findEnabledBlockItemForDomain(domain);
  if (!blockItem) return null;

  if (!blockItem.timeLimit) {
    return {
      hasTimeLimit: false,
      remainingSeconds: null,
      limitType: null,
      limitSeconds: null,
      usedSeconds: null,
      isExceeded: true // Always blocked
    };
  }

  const remaining = await getRemainingTime(domain, blockItem);
  const analytics = await getAnalytics();
  const usage = analytics.timeLimitUsage[domain];
  const effective = usage ? getEffectiveUsage(usage) : { dailyUsedSeconds: 0 };

  const usedSeconds = effective.dailyUsedSeconds;

  return {
    hasTimeLimit: true,
    remainingSeconds: remaining,
    limitType: blockItem.timeLimit.type,
    limitSeconds: blockItem.timeLimit.limitSeconds,
    usedSeconds,
    isExceeded: remaining !== null && remaining <= 0
  };
}
