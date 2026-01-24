import {
  getAnalytics,
  getLicense,
  getSettings,
  setAnalytics,
} from '~/lib/storage'
import { getTodayKey } from '~/lib/time'
import { checkAndCleanupDevMode } from '~/lib/devMode'
import { verifyStoredLicense } from '~/lib/gumroad'
import { getFeatureLimits } from '~/lib/license'

import { updateBlockRules } from './blocker'
import { startTracking, stopTracking } from './tracker'

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('VisionFocus installed')

  // Initialize block rules
  await updateBlockRules()

  // Start tracking
  startTracking()
})

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('VisionFocus started')

  // Check dev mode expiration
  await checkAndCleanupDevMode()

  // Update block rules
  await updateBlockRules()

  // Start tracking
  startTracking()
})

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-cleanup') {
    await cleanupOldAnalytics()
  }

  if (alarm.name === 'check-dev-mode') {
    await checkAndCleanupDevMode()
  }

  if (alarm.name === 'verify-license') {
    await verifyStoredLicense()
  }
})

// Set up alarms
chrome.alarms.create('daily-cleanup', { periodInMinutes: 60 })
chrome.alarms.create('check-dev-mode', { periodInMinutes: 5 }) // Check dev mode every 5 minutes
chrome.alarms.create('verify-license', { periodInMinutes: 60 * 24 }) // Verify license once per day

// Clean up analytics based on tier limits
async function cleanupOldAnalytics() {
  const analytics = await getAnalytics()
  const limits = await getFeatureLimits()

  // Determine max days based on tier
  const maxDays = limits.historyDays === Infinity ? 365 : limits.historyDays
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxDays)
  const cutoffKey = cutoffDate.toISOString().slice(0, 10)

  const cleanedDailyStats: typeof analytics.dailyStats = {}
  for (const [key, value] of Object.entries(analytics.dailyStats)) {
    if (key >= cutoffKey) {
      cleanedDailyStats[key] = value
    }
  }

  if (
    Object.keys(cleanedDailyStats).length !==
    Object.keys(analytics.dailyStats).length
  ) {
    await setAnalytics({
      ...analytics,
      dailyStats: cleanedDailyStats,
    })
  }
}

// Export for Plasmo
export {}
