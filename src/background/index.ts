import {
  getAnalytics,
  setAnalytics,
  storage,
  getSettings,
  incrementSiteBlockCount,
  setLastBlockedDomain
} from '~/lib/storage';
import { startExtPayBackgroundListener } from '~/lib/extpay';
import { getFeatureLimits } from '~/lib/license';
import { extractDomain, matchesDomain } from '~/lib/domain';
import { isWithinSchedule } from '~/lib/time';

import { updateBlockRules } from './blocker';
import { startTracking } from './tracker';
import { resetExpiredUsage } from './time-limit';

// Initialize ExtensionPay at top level (required for Manifest V3)
startExtPayBackgroundListener();

// Listen for settings changes and update block rules
storage.watch({
  settings: async () => {
    // Small delay to ensure storage is fully updated
    await new Promise((resolve) => setTimeout(resolve, 100));
    await updateBlockRules();
  }
});

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  // Initialize block rules
  await updateBlockRules();

  // Start tracking
  startTracking();
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  // Update block rules
  await updateBlockRules();

  // Start tracking
  startTracking();
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-cleanup') {
    await cleanupOldAnalytics();
  }
  if (alarm.name === 'check-schedule') {
    // Update block rules every minute to handle schedule changes
    await updateBlockRules();
  }
  if (alarm.name === 'time-limit-reset') {
    // Reset expired time limit usage
    await resetExpiredUsage();
  }
});

// Set up alarms
chrome.alarms.create('daily-cleanup', { periodInMinutes: 60 });
chrome.alarms.create('check-schedule', { periodInMinutes: 1 });
chrome.alarms.create('time-limit-reset', { periodInMinutes: 1 });

// Track blocked navigations and increment site block count
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only track main frame navigations
  if (details.frameId !== 0) return;

  const url = details.url;
  const domain = extractDomain(url);
  if (!domain) return;

  const settings = await getSettings();

  // Check if paused
  if (settings.paused) return;

  // Check if domain is in block list
  const isBlocked = settings.blockList.some((item) =>
    matchesDomain(domain, item)
  );
  if (!isBlocked) return;

  // Check schedules
  if (settings.schedules.length > 0) {
    const isScheduled = settings.schedules.some(
      (schedule) =>
        schedule.enabled &&
        isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
    );
    if (!isScheduled) return;
  }

  // Increment block count for this domain
  await incrementSiteBlockCount(domain);

  // Store last blocked domain for newtab display
  await setLastBlockedDomain(domain);

  // Also increment daily stats block count
  const analytics = await getAnalytics();
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = analytics.dailyStats[today] || {
    date: today,
    wasteTime: 0,
    investTime: 0,
    blockCount: 0
  };

  await setAnalytics({
    ...analytics,
    dailyStats: {
      ...analytics.dailyStats,
      [today]: {
        ...todayStats,
        blockCount: todayStats.blockCount + 1
      }
    }
  });
});

// Clean up analytics based on tier limits
async function cleanupOldAnalytics() {
  const analytics = await getAnalytics();
  const limits = await getFeatureLimits();

  // Determine max days based on tier
  const maxDays = limits.historyDays === Infinity ? 365 : limits.historyDays;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxDays);
  const cutoffKey = cutoffDate.toISOString().slice(0, 10);

  const cleanedDailyStats: typeof analytics.dailyStats = {};
  for (const [key, value] of Object.entries(analytics.dailyStats)) {
    if (key >= cutoffKey) {
      cleanedDailyStats[key] = value;
    }
  }

  if (
    Object.keys(cleanedDailyStats).length !==
    Object.keys(analytics.dailyStats).length
  ) {
    await setAnalytics({
      ...analytics,
      dailyStats: cleanedDailyStats
    });
  }
}

// Export for Plasmo
export {};
