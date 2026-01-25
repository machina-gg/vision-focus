import type { PlasmoMessaging } from '@plasmohq/messaging'

import { extractDomain } from '~/lib/domain'
import { getAnalytics, setAnalytics } from '~/lib/storage'
import { getTodayKey } from '~/lib/time'
import { TRACKER_CONFIG } from '~/constants/limits'
import type { DailyStat, SiteTime } from '~/types/storage'

// Track active pages and their last heartbeat
interface ActivePage {
  domain: string
  lastHeartbeat: number
  isActive: boolean
}

// Store active pages (keyed by tab ID or URL)
const activePages = new Map<string, ActivePage>()

// Track recording timer
let recordingTimer: ReturnType<typeof setInterval> | null = null

// Start the recording timer if not already running
function ensureRecordingTimer() {
  if (recordingTimer) return

  recordingTimer = setInterval(async () => {
    const now = Date.now()

    // Record time for all active pages
    for (const [_key, page] of activePages.entries()) {
      // Check if page is still active (received heartbeat recently)
      const timeSinceHeartbeat = now - page.lastHeartbeat

      if (
        page.isActive &&
        timeSinceHeartbeat <= TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS
      ) {
        // Record 5 seconds of time for this page
        await recordTime(
          page.domain,
          Math.floor(TRACKER_CONFIG.RECORDING_INTERVAL_MS / 1000)
        )
      } else if (timeSinceHeartbeat > TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS) {
        // Page is stale, mark as inactive
        page.isActive = false
      }
    }

    // Clean up stale entries (no heartbeat for over 1 minute)
    for (const [key, page] of activePages.entries()) {
      if (now - page.lastHeartbeat > 60 * 1000) {
        activePages.delete(key)
      }
    }

    // Stop timer if no active pages
    if (activePages.size === 0 && recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
  }, TRACKER_CONFIG.RECORDING_INTERVAL_MS)
}

// Record time for a domain
async function recordTime(domain: string, seconds: number): Promise<void> {
  if (seconds <= 0 || !domain) return

  const analytics = await getAnalytics()
  const todayKey = getTodayKey()

  // Get category for this domain
  const category = analytics.siteCategories[domain] || 'neutral'

  // Update site time
  const existingSiteTime = analytics.siteTime[domain]
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

// Valid status values
const VALID_STATUSES = ['active', 'inactive', 'heartbeat'] as const

// Message handler
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { url, status, timestamp } = req.body as {
    url: string
    status: 'active' | 'inactive' | 'heartbeat'
    timestamp: number
  }

  // Validate url
  if (!url || typeof url !== 'string' || url.length > 2048) {
    res.send({ success: false, error: 'Invalid URL' })
    return
  }

  // Validate status
  if (!status || !VALID_STATUSES.includes(status)) {
    res.send({ success: false, error: 'Invalid status' })
    return
  }

  // Validate timestamp if provided
  if (timestamp !== undefined) {
    if (
      typeof timestamp !== 'number' ||
      !Number.isFinite(timestamp) ||
      timestamp < 0
    ) {
      res.send({ success: false, error: 'Invalid timestamp' })
      return
    }
  }

  // Extract domain from URL
  const domain = extractDomain(url)
  if (!domain) {
    res.send({ success: false, error: 'Invalid URL' })
    return
  }

  // Create a unique key for this page
  const pageKey = domain // Use domain as key (aggregate by domain)

  // Handle different status types
  switch (status) {
    case 'active':
      // Page became active
      activePages.set(pageKey, {
        domain,
        lastHeartbeat: timestamp || Date.now(),
        isActive: true,
      })
      ensureRecordingTimer()
      break

    case 'inactive': {
      // Page became inactive
      const inactivePage = activePages.get(pageKey)
      if (inactivePage) {
        inactivePage.isActive = false
      }
      break
    }

    case 'heartbeat': {
      // Regular heartbeat - update last heartbeat time
      const existingPage = activePages.get(pageKey)
      if (existingPage) {
        existingPage.lastHeartbeat = timestamp || Date.now()
        existingPage.isActive = true
      } else {
        // New page, add it
        activePages.set(pageKey, {
          domain,
          lastHeartbeat: timestamp || Date.now(),
          isActive: true,
        })
        ensureRecordingTimer()
      }
      break
    }
  }

  res.send({ success: true })
}

export default handler
