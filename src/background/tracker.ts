import { extractDomain } from '~/lib/domain'
import { getAnalytics, setAnalytics } from '~/lib/storage'
import { getTodayKey } from '~/lib/time'
import type { DailyStat, SiteTime } from '~/types/storage'

let activeTabId: number | null = null
let activeDomain: string | null = null
let lastUpdateTime: number = Date.now()
let trackingInterval: ReturnType<typeof setInterval> | null = null

// Start tracking
export function startTracking(): void {
  if (trackingInterval) {
    clearInterval(trackingInterval)
  }

  // Update every second
  trackingInterval = setInterval(updateTracking, 1000)

  // Listen for tab changes
  chrome.tabs.onActivated.addListener(handleTabActivated)
  chrome.tabs.onUpdated.addListener(handleTabUpdated)
  chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged)

  // Initialize with current tab
  initializeCurrentTab()
}

// Stop tracking
export function stopTracking(): void {
  if (trackingInterval) {
    clearInterval(trackingInterval)
    trackingInterval = null
  }

  chrome.tabs.onActivated.removeListener(handleTabActivated)
  chrome.tabs.onUpdated.removeListener(handleTabUpdated)
  chrome.windows.onFocusChanged.removeListener(handleWindowFocusChanged)
}

// Initialize with current active tab
async function initializeCurrentTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id && tab?.url) {
      activeTabId = tab.id
      activeDomain = extractDomain(tab.url)
      lastUpdateTime = Date.now()
    }
  } catch {
    // Silently handle error - tracking will start on next tab activation
  }
}

// Handle tab activation
async function handleTabActivated(
  activeInfo: chrome.tabs.TabActiveInfo
): Promise<void> {
  if (!isContextValid()) return

  // Save time for previous tab
  await saveElapsedTime()

  // Update to new tab
  activeTabId = activeInfo.tabId

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    activeDomain = tab.url ? extractDomain(tab.url) : null
  } catch {
    activeDomain = null
  }

  lastUpdateTime = Date.now()
}

// Handle tab URL updates
async function handleTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  _tab: chrome.tabs.Tab
): Promise<void> {
  if (!isContextValid()) return
  if (tabId !== activeTabId || !changeInfo.url) return

  // Save time for previous domain
  await saveElapsedTime()

  // Update to new domain
  activeDomain = extractDomain(changeInfo.url)
  lastUpdateTime = Date.now()
}

// Handle window focus changes
async function handleWindowFocusChanged(windowId: number): Promise<void> {
  if (!isContextValid()) return

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, save time
    await saveElapsedTime()
    activeDomain = null
  } else {
    // Browser gained focus, get current tab
    await initializeCurrentTab()
  }
}

// Check if extension context is still valid
function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id
  } catch {
    return false
  }
}

// Update tracking (called every second)
async function updateTracking(): Promise<void> {
  if (!activeDomain || !isContextValid()) return

  const now = Date.now()
  const elapsed = Math.floor((now - lastUpdateTime) / 1000)

  if (elapsed >= 1) {
    try {
      await recordTime(activeDomain, elapsed)
      lastUpdateTime = now
    } catch {
      // Extension context invalidated, stop tracking
      if (trackingInterval) {
        clearInterval(trackingInterval)
        trackingInterval = null
      }
    }
  }
}

// Save elapsed time for current domain
async function saveElapsedTime(): Promise<void> {
  if (!activeDomain || !isContextValid()) return

  const now = Date.now()
  const elapsed = Math.floor((now - lastUpdateTime) / 1000)

  if (elapsed > 0) {
    try {
      await recordTime(activeDomain, elapsed)
    } catch {
      // Extension context invalidated, ignore
    }
  }
}

// Record time for a domain
async function recordTime(domain: string, seconds: number): Promise<void> {
  if (seconds <= 0) return

  const analytics = await getAnalytics()
  const todayKey = getTodayKey()

  // Update site time
  const existingSiteTime = analytics.siteTime[domain]
  const category = analytics.siteCategories[domain] || 'neutral'

  const updatedSiteTime: SiteTime = {
    domain,
    time: (existingSiteTime?.time || 0) + seconds,
    category,
    lastUpdated: new Date().toISOString(),
  }
  analytics.siteTime[domain] = updatedSiteTime

  // Update daily stats
  const existingDailyStat = analytics.dailyStats[todayKey]
  const updatedDailyStat: DailyStat = {
    date: todayKey,
    wasteTime:
      (existingDailyStat?.wasteTime || 0) +
      (category === 'waste' ? seconds : 0),
    investTime:
      (existingDailyStat?.investTime || 0) +
      (category === 'invest' ? seconds : 0),
    blockCount: existingDailyStat?.blockCount || 0,
  }
  analytics.dailyStats[todayKey] = updatedDailyStat

  await setAnalytics(analytics)
}

// Increment block count for today
export async function incrementBlockCount(): Promise<void> {
  const analytics = await getAnalytics()
  const todayKey = getTodayKey()

  const existingDailyStat = analytics.dailyStats[todayKey]
  const updatedDailyStat: DailyStat = {
    date: todayKey,
    wasteTime: existingDailyStat?.wasteTime || 0,
    investTime: existingDailyStat?.investTime || 0,
    blockCount: (existingDailyStat?.blockCount || 0) + 1,
  }
  analytics.dailyStats[todayKey] = updatedDailyStat

  await setAnalytics(analytics)
}

// Set category for a domain
export async function setSiteCategory(
  domain: string,
  category: 'waste' | 'invest' | 'neutral'
): Promise<void> {
  const analytics = await getAnalytics()
  analytics.siteCategories[domain] = category

  // Update existing site time if it exists
  if (analytics.siteTime[domain]) {
    analytics.siteTime[domain].category = category
  }

  await setAnalytics(analytics)
}

// Get today's stats
export async function getTodayStats(): Promise<DailyStat> {
  const analytics = await getAnalytics()
  const todayKey = getTodayKey()

  return (
    analytics.dailyStats[todayKey] || {
      date: todayKey,
      wasteTime: 0,
      investTime: 0,
      blockCount: 0,
    }
  )
}
