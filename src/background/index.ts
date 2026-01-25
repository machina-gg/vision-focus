import { getAnalytics, setAnalytics, storage, getSettings } from '~/lib/storage'
import { startExtPayBackgroundListener } from '~/lib/extpay'
import { getFeatureLimits } from '~/lib/license'

import { updateBlockRules } from './blocker'
import { startTracking } from './tracker'

// Initialize ExtensionPay at top level (required for Manifest V3)
startExtPayBackgroundListener()

// Listen for settings changes and update block rules
storage.watch({
  settings: async () => {
    // Small delay to ensure storage is fully updated
    await new Promise((resolve) => setTimeout(resolve, 100))
    await updateBlockRules()
  },
})

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
  if (alarm.name === 'check-schedule') {
    // Update block rules every minute to handle schedule changes
    await updateBlockRules()
  }
})

// Set up alarms
chrome.alarms.create('daily-cleanup', { periodInMinutes: 60 })
chrome.alarms.create('check-schedule', { periodInMinutes: 1 })

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
