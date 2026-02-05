/**
 * YouTubeBlockService - YouTube-specific Block and Time Limit Logic
 *
 * This service handles YouTube-specific functionality:
 * - Recording YouTube time limit usage
 * - Checking if YouTube has exceeded its time limit
 * - Getting remaining time for YouTube
 * - Incrementing YouTube block count
 *
 * Uses common functions from timeLimitService to avoid duplication.
 */

import { getSettings, getAnalytics, setAnalytics } from '~/lib/storage';
import {
  getTodayKey,
  getCurrentHourKey,
  needsDailyReset,
  needsHourlyReset
} from '~/lib/time';
import type { YouTubeSettings } from '~/types/storage';
import {
  checkTimeLimitExceeded,
  calculateRemainingTime
} from '~/lib/timeLimitService';

// YouTube domain key used for analytics storage
export const YOUTUBE_DOMAIN = 'youtube.com';

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
 * Uses shared checkTimeLimitExceeded from timeLimitService
 */
export async function hasYouTubeExceededTimeLimit(): Promise<boolean> {
  const settings = await getSettings();
  const youtube: YouTubeSettings = settings.youtube;

  if (!youtube.enabled || !youtube.timeLimit) {
    return false;
  }

  const analytics = await getAnalytics();
  return checkTimeLimitExceeded(YOUTUBE_DOMAIN, youtube.timeLimit, analytics);
}

/**
 * Get remaining time in seconds for YouTube
 * Returns null if no time limit is set
 * Uses shared calculateRemainingTime from timeLimitService
 */
export async function getYouTubeRemainingTime(): Promise<number | null> {
  const settings = await getSettings();
  const youtube: YouTubeSettings = settings.youtube;

  if (!youtube.enabled || !youtube.timeLimit) {
    return null;
  }

  const analytics = await getAnalytics();
  return calculateRemainingTime(YOUTUBE_DOMAIN, youtube.timeLimit, analytics);
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
