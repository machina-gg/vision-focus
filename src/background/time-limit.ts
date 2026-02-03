import { getAnalytics, setAnalytics, getSettings } from '~/lib/storage';
import {
  getTodayKey,
  getCurrentHourKey,
  needsDailyReset,
  needsHourlyReset
} from '~/lib/time';
import { matchesDomain, extractDomain } from '~/lib/domain';
import type { TimeLimitUsage, BlockItem } from '~/types/storage';

// Find the BlockItem that matches a domain (supports wildcards)
export async function findBlockItemForDomain(
  domain: string
): Promise<BlockItem | null> {
  const settings = await getSettings();
  return (
    settings.blockList.find(
      (item) => item.enabled && matchesDomain(domain, item)
    ) || null
  );
}

// Get or create time limit usage for a domain
async function getOrCreateUsage(domain: string): Promise<TimeLimitUsage> {
  const analytics = await getAnalytics();
  const existing = analytics.timeLimitUsage[domain];

  if (existing) {
    return existing;
  }

  const newUsage: TimeLimitUsage = {
    domain,
    dailyUsedSeconds: 0,
    hourlyUsedSeconds: 0,
    lastDailyReset: getTodayKey(),
    lastHourlyReset: getCurrentHourKey()
  };

  return newUsage;
}

// Check if a domain has exceeded its time limit
export async function hasExceededTimeLimit(domain: string): Promise<boolean> {
  const blockItem = await findBlockItemForDomain(domain);

  if (!blockItem || !blockItem.timeLimit) {
    // No time limit configured - always blocked (when enabled)
    return blockItem?.enabled ?? false;
  }

  const usage = await getOrCreateUsage(domain);
  const { type, limitSeconds } = blockItem.timeLimit;

  // Check if reset is needed
  if (type === 'daily' && needsDailyReset(usage.lastDailyReset)) {
    // Reset happened, so usage is 0
    return false;
  }

  if (type === 'hourly' && needsHourlyReset(usage.lastHourlyReset)) {
    // Reset happened, so usage is 0
    return false;
  }

  const usedSeconds =
    type === 'daily' ? usage.dailyUsedSeconds : usage.hourlyUsedSeconds;
  return usedSeconds >= limitSeconds;
}

// Get remaining time in seconds for a domain
// Returns null if no time limit is set or site is not in block list
export async function getRemainingTime(
  domain: string
): Promise<number | null> {
  const blockItem = await findBlockItemForDomain(domain);

  if (!blockItem || !blockItem.timeLimit) {
    return null; // No time limit configured
  }

  const usage = await getOrCreateUsage(domain);
  const { type, limitSeconds } = blockItem.timeLimit;

  // Check for reset
  if (type === 'daily' && needsDailyReset(usage.lastDailyReset)) {
    return limitSeconds; // Full time available after reset
  }

  if (type === 'hourly' && needsHourlyReset(usage.lastHourlyReset)) {
    return limitSeconds; // Full time available after reset
  }

  const usedSeconds =
    type === 'daily' ? usage.dailyUsedSeconds : usage.hourlyUsedSeconds;
  return Math.max(0, limitSeconds - usedSeconds);
}

// Record time usage for a domain
export async function recordTimeLimitUsage(
  domain: string,
  seconds: number
): Promise<void> {
  if (seconds <= 0) return;

  const blockItem = await findBlockItemForDomain(domain);

  if (!blockItem || !blockItem.timeLimit) {
    return; // No time limit configured
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

// Reset expired usage entries (called periodically by alarm)
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

// Get time limit info for a URL (used by popup/newtab)
export async function getTimeLimitInfoForUrl(
  url: string
): Promise<{
  hasTimeLimit: boolean;
  remainingSeconds: number | null;
  limitType: 'daily' | 'hourly' | null;
  limitSeconds: number | null;
  usedSeconds: number | null;
  isExceeded: boolean;
} | null> {
  const domain = extractDomain(url);
  if (!domain) return null;

  const blockItem = await findBlockItemForDomain(domain);
  if (!blockItem || !blockItem.enabled) return null;

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

  const remaining = await getRemainingTime(domain);
  const analytics = await getAnalytics();
  const usage = analytics.timeLimitUsage[domain];

  const usedSeconds = usage
    ? blockItem.timeLimit.type === 'daily'
      ? usage.dailyUsedSeconds
      : usage.hourlyUsedSeconds
    : 0;

  return {
    hasTimeLimit: true,
    remainingSeconds: remaining,
    limitType: blockItem.timeLimit.type,
    limitSeconds: blockItem.timeLimit.limitSeconds,
    usedSeconds,
    isExceeded: remaining !== null && remaining <= 0
  };
}
