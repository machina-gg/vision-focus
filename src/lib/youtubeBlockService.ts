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
import { getTodayKey, needsDailyReset } from '~/lib/time';
import type { TimeLimit, YouTubeSettings } from '~/types/storage';
import {
  checkTimeLimitExceeded,
  calculateRemainingTime
} from '~/lib/timeLimitService';

// YouTube domain key used for analytics storage
export const YOUTUBE_DOMAIN = 'youtube.com';

/**
 * YouTube の時間制限が有効かどうかを判定する（計測・超過判定・残り時間・通知の共通ガード）
 *
 * アクセスブロックが無効なら時間制限は使わない。設定画面が時間制限の欄を
 * アクセスブロックの下位設定として見せているのに合わせ、blockService の
 * `getYouTubeBlockItem()` と条件を揃える（#407）
 */
export function isYouTubeTimeLimitActive(
  youtube: YouTubeSettings
): youtube is YouTubeSettings & { timeLimit: TimeLimit } {
  return Boolean(youtube.enabled && youtube.blockAccess && youtube.timeLimit);
}

/**
 * Record YouTube time limit usage
 * Uses settings.youtube.timeLimit instead of blocklist
 * Does nothing unless isYouTubeTimeLimitActive()
 */
export async function recordYouTubeTimeLimitUsage(
  seconds: number
): Promise<void> {
  if (seconds <= 0) return;

  const settings = await getSettings();
  const youtube: YouTubeSettings = settings.youtube;

  if (!isYouTubeTimeLimitActive(youtube)) {
    return;
  }

  const analytics = await getAnalytics();
  const usage = analytics.timeLimitUsage[YOUTUBE_DOMAIN] || {
    domain: YOUTUBE_DOMAIN,
    dailyUsedSeconds: 0,
    lastDailyReset: getTodayKey()
  };

  const todayKey = getTodayKey();

  if (needsDailyReset(usage.lastDailyReset)) {
    usage.dailyUsedSeconds = 0;
    usage.lastDailyReset = todayKey;
  }

  usage.dailyUsedSeconds += seconds;

  analytics.timeLimitUsage[YOUTUBE_DOMAIN] = usage;
  await setAnalytics(analytics);
}

/**
 * Check if YouTube has exceeded its time limit
 * Returns false unless isYouTubeTimeLimitActive()
 * Uses shared checkTimeLimitExceeded from timeLimitService
 */
export async function hasYouTubeExceededTimeLimit(): Promise<boolean> {
  const settings = await getSettings();
  const youtube: YouTubeSettings = settings.youtube;

  if (!isYouTubeTimeLimitActive(youtube)) {
    return false;
  }

  const analytics = await getAnalytics();
  return checkTimeLimitExceeded(YOUTUBE_DOMAIN, youtube.timeLimit, analytics);
}

/**
 * Get remaining time in seconds for YouTube
 * Returns null unless isYouTubeTimeLimitActive()
 * Uses shared calculateRemainingTime from timeLimitService
 */
export async function getYouTubeRemainingTime(): Promise<number | null> {
  const settings = await getSettings();
  const youtube: YouTubeSettings = settings.youtube;

  if (!isYouTubeTimeLimitActive(youtube)) {
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
