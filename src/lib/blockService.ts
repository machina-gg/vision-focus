/**
 * BlockService - Centralized Block State Management
 *
 * This service provides a single source of truth for block state determination.
 * All block-related logic should go through this service to ensure consistency.
 *
 * @see docs/BLOCK_STATE_MACHINE.md for state transition diagrams
 */

import { getSettings, getAnalytics, setAnalytics } from '~/lib/storage';
import { extractDomain, matchesDomain } from '~/lib/domain';
import { isWithinSchedule, getTodayKey, getCurrentHourKey, needsDailyReset, needsHourlyReset } from '~/lib/time';
import type { AppSettings, BlockItem, Schedule, TimeLimitUsage, AnalyticsData, YouTubeSettings } from '~/types/storage';

// Block reason type - matches the state machine documentation
export type BlockReason = 'always_blocked' | 'time_limit_exceeded' | null;

// Block state result
export interface BlockState {
  blocked: boolean;
  reason: BlockReason;
  remainingSeconds?: number;
}

// Time limit info for UI display
export interface TimeLimitInfo {
  hasTimeLimit: boolean;
  remainingSeconds: number | null;
  limitType: 'daily' | 'hourly' | null;
  limitSeconds: number | null;
  usedSeconds: number | null;
  isExceeded: boolean;
}

/**
 * Find the BlockItem that matches a domain (supports wildcards)
 * This is the single entry point for domain-to-block-item mapping
 */
export async function findBlockItemForDomain(
  domain: string,
  settings?: AppSettings
): Promise<BlockItem | null> {
  const s = settings ?? await getSettings();
  return (
    s.blockList.find((item) => matchesDomain(domain, item)) || null
  );
}

/**
 * Find the enabled BlockItem that matches a domain
 * Only returns items where enabled=true
 */
export async function findEnabledBlockItemForDomain(
  domain: string,
  settings?: AppSettings
): Promise<BlockItem | null> {
  const item = await findBlockItemForDomain(domain, settings);
  return item?.enabled ? item : null;
}

/**
 * Check if any schedule is currently active
 * No schedules = always active (return true)
 */
export function isAnyScheduleActive(schedules: Schedule[]): boolean {
  if (schedules.length === 0) return true;
  return schedules.some(
    (schedule) =>
      schedule.enabled &&
      isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
  );
}

/**
 * Get or create time limit usage for a domain
 */
function getOrCreateUsage(
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
    hourlyUsedSeconds: 0,
    lastDailyReset: getTodayKey(),
    lastHourlyReset: getCurrentHourKey()
  };
}

/**
 * Apply resets to usage if needed and return the effective usage values
 */
function getEffectiveUsage(usage: TimeLimitUsage): {
  dailyUsedSeconds: number;
  hourlyUsedSeconds: number;
  wasReset: boolean;
} {
  let dailyUsedSeconds = usage.dailyUsedSeconds;
  let hourlyUsedSeconds = usage.hourlyUsedSeconds;
  let wasReset = false;

  if (needsDailyReset(usage.lastDailyReset)) {
    dailyUsedSeconds = 0;
    wasReset = true;
  }

  if (needsHourlyReset(usage.lastHourlyReset)) {
    hourlyUsedSeconds = 0;
    wasReset = true;
  }

  return { dailyUsedSeconds, hourlyUsedSeconds, wasReset };
}

/**
 * Check if a domain has exceeded its time limit
 */
export async function hasExceededTimeLimit(
  domain: string,
  blockItem?: BlockItem | null
): Promise<boolean> {
  const item = blockItem ?? await findEnabledBlockItemForDomain(domain);

  if (!item) {
    return false;
  }

  if (!item.timeLimit) {
    // No time limit configured - always blocked when enabled
    return true;
  }

  const analytics = await getAnalytics();
  const usage = getOrCreateUsage(domain, analytics);
  const effective = getEffectiveUsage(usage);

  const { type, limitSeconds } = item.timeLimit;
  const usedSeconds =
    type === 'daily' ? effective.dailyUsedSeconds : effective.hourlyUsedSeconds;

  return usedSeconds >= limitSeconds;
}

/**
 * Get remaining time in seconds for a domain
 * Returns null if no time limit is set
 */
export async function getRemainingTime(
  domain: string,
  blockItem?: BlockItem | null
): Promise<number | null> {
  const item = blockItem ?? await findEnabledBlockItemForDomain(domain);

  if (!item || !item.timeLimit) {
    return null;
  }

  const analytics = await getAnalytics();
  const usage = getOrCreateUsage(domain, analytics);
  const effective = getEffectiveUsage(usage);

  const { type, limitSeconds } = item.timeLimit;
  const usedSeconds =
    type === 'daily' ? effective.dailyUsedSeconds : effective.hourlyUsedSeconds;

  return Math.max(0, limitSeconds - usedSeconds);
}

/**
 * Determine the block state for a URL
 * This is the main entry point for block state determination
 *
 * Flow (see BLOCK_STATE_MACHINE.md):
 * 1. Check global pause
 * 2. Find matching block item
 * 3. Check if item is enabled
 * 4. Check schedules
 * 5. Check time limits
 */
export async function getBlockState(url: string): Promise<BlockState> {
  const domain = extractDomain(url);
  if (!domain) return { blocked: false, reason: null };

  const settings = await getSettings();

  // Step 1: Check global pause
  if (settings.paused) {
    return { blocked: false, reason: null };
  }

  // Step 2: Find matching block item
  const blockItem = await findBlockItemForDomain(domain, settings);
  if (!blockItem) {
    return { blocked: false, reason: null };
  }

  // Step 3: Check if item is enabled
  if (!blockItem.enabled) {
    return { blocked: false, reason: null };
  }

  // Step 4: Check schedules
  if (!isAnyScheduleActive(settings.schedules)) {
    return { blocked: false, reason: null };
  }

  // Step 5: Check time limits
  if (blockItem.timeLimit) {
    const exceeded = await hasExceededTimeLimit(domain, blockItem);
    const remaining = exceeded ? 0 : await getRemainingTime(domain, blockItem);
    return {
      blocked: exceeded,
      reason: exceeded ? 'time_limit_exceeded' : null,
      remainingSeconds: remaining ?? undefined
    };
  }

  // No time limit - always blocked
  return { blocked: true, reason: 'always_blocked' };
}

/**
 * Check if a URL should be blocked (convenience method)
 */
export async function shouldBlockUrl(url: string): Promise<boolean> {
  const state = await getBlockState(url);
  return state.blocked;
}

/**
 * Check if a domain should be tracked for block count
 * This validates all conditions: enabled, schedule, etc.
 */
export async function shouldTrackBlockForDomain(domain: string): Promise<boolean> {
  const settings = await getSettings();

  // Check global pause
  if (settings.paused) {
    return false;
  }

  // Find matching block item
  const blockItem = await findBlockItemForDomain(domain, settings);
  if (!blockItem) {
    return false;
  }

  // Check if enabled
  if (!blockItem.enabled) {
    return false;
  }

  // Check schedules
  if (!isAnyScheduleActive(settings.schedules)) {
    return false;
  }

  return true;
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
    hourlyUsedSeconds: 0,
    lastDailyReset: getTodayKey(),
    lastHourlyReset: getCurrentHourKey()
  };

  const todayKey = getTodayKey();
  const hourKey = getCurrentHourKey();

  // Check and apply daily reset
  if (needsDailyReset(usage.lastDailyReset)) {
    usage.dailyUsedSeconds = 0;
    usage.lastDailyReset = todayKey;
  }

  // Check and apply hourly reset
  if (needsHourlyReset(usage.lastHourlyReset)) {
    usage.hourlyUsedSeconds = 0;
    usage.lastHourlyReset = hourKey;
  }

  // Add the time
  usage.dailyUsedSeconds += seconds;
  usage.hourlyUsedSeconds += seconds;

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
  const hourKey = getCurrentHourKey();
  let updated = false;

  for (const domain of Object.keys(analytics.timeLimitUsage)) {
    const usage = analytics.timeLimitUsage[domain];

    if (needsDailyReset(usage.lastDailyReset)) {
      usage.dailyUsedSeconds = 0;
      usage.lastDailyReset = todayKey;
      updated = true;
    }

    if (needsHourlyReset(usage.lastHourlyReset)) {
      usage.hourlyUsedSeconds = 0;
      usage.lastHourlyReset = hourKey;
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
export async function getTimeLimitInfo(url: string): Promise<TimeLimitInfo | null> {
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
  const effective = usage ? getEffectiveUsage(usage) : { dailyUsedSeconds: 0, hourlyUsedSeconds: 0 };

  const usedSeconds =
    blockItem.timeLimit.type === 'daily'
      ? effective.dailyUsedSeconds
      : effective.hourlyUsedSeconds;

  return {
    hasTimeLimit: true,
    remainingSeconds: remaining,
    limitType: blockItem.timeLimit.type,
    limitSeconds: blockItem.timeLimit.limitSeconds,
    usedSeconds,
    isExceeded: remaining !== null && remaining <= 0
  };
}

/**
 * Get list of domains that should be actively blocked via declarativeNetRequest
 * Only includes always-blocked sites (no time limit) that are enabled and within schedule
 */
export async function getActiveBlockedDomains(): Promise<string[]> {
  const settings = await getSettings();

  // If paused, don't block anything
  if (settings.paused) {
    return [];
  }

  // If no schedule is active, don't block anything
  if (!isAnyScheduleActive(settings.schedules)) {
    return [];
  }

  // Only include always-blocked sites (enabled and no time limit)
  return settings.blockList
    .filter((item) => item.enabled && !item.timeLimit)
    .map((item) => item.domain);
}

// YouTube domain key used for analytics storage
const YOUTUBE_DOMAIN = 'youtube.com';

/**
 * Record YouTube time limit usage
 * Uses settings.youtube.timeLimit instead of blocklist
 */
export async function recordYouTubeTimeLimitUsage(
  seconds: number
): Promise<void> {
  if (seconds <= 0) return;

  const settings = await getSettings();
  const youtube: YouTubeSettings = settings.youtube;

  if (!youtube.enabled || !youtube.timeLimit) {
    return;
  }

  const analytics = await getAnalytics();
  const usage = analytics.timeLimitUsage[YOUTUBE_DOMAIN] || {
    domain: YOUTUBE_DOMAIN,
    dailyUsedSeconds: 0,
    hourlyUsedSeconds: 0,
    lastDailyReset: getTodayKey(),
    lastHourlyReset: getCurrentHourKey()
  };

  const todayKey = getTodayKey();
  const hourKey = getCurrentHourKey();

  if (needsDailyReset(usage.lastDailyReset)) {
    usage.dailyUsedSeconds = 0;
    usage.lastDailyReset = todayKey;
  }

  if (needsHourlyReset(usage.lastHourlyReset)) {
    usage.hourlyUsedSeconds = 0;
    usage.lastHourlyReset = hourKey;
  }

  usage.dailyUsedSeconds += seconds;
  usage.hourlyUsedSeconds += seconds;

  analytics.timeLimitUsage[YOUTUBE_DOMAIN] = usage;
  await setAnalytics(analytics);
}

/**
 * Check if YouTube has exceeded its time limit
 */
export async function hasYouTubeExceededTimeLimit(): Promise<boolean> {
  const settings = await getSettings();
  const youtube: YouTubeSettings = settings.youtube;

  if (!youtube.enabled || !youtube.timeLimit) {
    return false;
  }

  const analytics = await getAnalytics();
  const usage = getOrCreateUsage(YOUTUBE_DOMAIN, analytics);
  const effective = getEffectiveUsage(usage);

  const { type, limitSeconds } = youtube.timeLimit;
  const usedSeconds =
    type === 'daily' ? effective.dailyUsedSeconds : effective.hourlyUsedSeconds;

  return usedSeconds >= limitSeconds;
}

/**
 * Get remaining time in seconds for YouTube
 * Returns null if no time limit is set
 */
export async function getYouTubeRemainingTime(): Promise<number | null> {
  const settings = await getSettings();
  const youtube: YouTubeSettings = settings.youtube;

  if (!youtube.enabled || !youtube.timeLimit) {
    return null;
  }

  const analytics = await getAnalytics();
  const usage = getOrCreateUsage(YOUTUBE_DOMAIN, analytics);
  const effective = getEffectiveUsage(usage);

  const { type, limitSeconds } = youtube.timeLimit;
  const usedSeconds =
    type === 'daily' ? effective.dailyUsedSeconds : effective.hourlyUsedSeconds;

  return Math.max(0, limitSeconds - usedSeconds);
}

/**
 * Increment YouTube block count in analytics
 */
export async function incrementYouTubeBlockCount(): Promise<void> {
  const analytics = await getAnalytics();
  const existing = analytics.siteBlockCounts[YOUTUBE_DOMAIN];

  analytics.siteBlockCounts[YOUTUBE_DOMAIN] = {
    domain: YOUTUBE_DOMAIN,
    count: (existing?.count ?? 0) + 1,
    lastBlocked: new Date().toISOString()
  };

  await setAnalytics(analytics);
}
