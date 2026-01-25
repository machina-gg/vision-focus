import type { PlasmoCSConfig } from 'plasmo'
import { sendToBackground } from '@plasmohq/messaging'

// Run on all pages
export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_idle',
}

// Activity detection state
let isUserActive = false
let lastActivityTime = Date.now()
let heartbeatInterval: ReturnType<typeof setInterval> | null = null

// Activity timeout (consider user inactive after 30 seconds of no activity)
const ACTIVITY_TIMEOUT_MS = 30 * 1000

// Heartbeat interval (send heartbeat every 5 seconds when active)
const HEARTBEAT_INTERVAL_MS = 5 * 1000

// Activity events to listen for
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel',
]

// Throttle function to limit event processing
function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle = false
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }) as T
}

// Handle user activity
const handleActivity = throttle(() => {
  lastActivityTime = Date.now()

  if (!isUserActive) {
    isUserActive = true
    // Send activity start notification
    sendHeartbeat('active')
  }
}, 1000) // Throttle to max once per second

// Check if user is still active
function checkActivity() {
  const now = Date.now()
  const timeSinceLastActivity = now - lastActivityTime

  if (isUserActive && timeSinceLastActivity > ACTIVITY_TIMEOUT_MS) {
    isUserActive = false
    // Send inactive notification
    sendHeartbeat('inactive')
  }
}

// Send heartbeat to background
async function sendHeartbeat(status: 'active' | 'inactive' | 'heartbeat') {
  try {
    await sendToBackground({
      name: 'tracker-heartbeat',
      body: {
        url: window.location.href,
        status,
        timestamp: Date.now(),
      },
    })
  } catch {
    // Silently fail if background is not available (e.g., extension context invalidated)
  }
}

// Handle visibility change
function handleVisibilityChange() {
  if (document.hidden) {
    // Page is hidden, notify background
    sendHeartbeat('inactive')
    isUserActive = false
  } else {
    // Page is visible again, reset activity detection
    lastActivityTime = Date.now()
    isUserActive = true
    sendHeartbeat('active')
  }
}

// Start tracking
function startTracking() {
  // Add activity listeners
  ACTIVITY_EVENTS.forEach((event) => {
    document.addEventListener(event, handleActivity, { passive: true })
  })

  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Start heartbeat interval
  heartbeatInterval = setInterval(() => {
    checkActivity()

    if (isUserActive && !document.hidden) {
      sendHeartbeat('heartbeat')
    }
  }, HEARTBEAT_INTERVAL_MS)

  // Initial heartbeat if page is visible
  if (!document.hidden) {
    isUserActive = true
    sendHeartbeat('active')
  }
}

// Stop tracking
function stopTracking() {
  // Remove activity listeners
  ACTIVITY_EVENTS.forEach((event) => {
    document.removeEventListener(event, handleActivity)
  })

  // Remove visibility listener
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // Clear interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }

  // Send final inactive status
  if (isUserActive) {
    sendHeartbeat('inactive')
    isUserActive = false
  }
}

// Handle page unload
function handleUnload() {
  stopTracking()
}

// Initialize
function init() {
  // Skip tracking for extension pages
  if (
    window.location.protocol === 'chrome-extension:' ||
    window.location.protocol === 'moz-extension:' ||
    window.location.protocol === 'about:'
  ) {
    return
  }

  startTracking()

  // Clean up on page hide (replaces deprecated unload event)
  // pagehide is the modern replacement that works with bfcache
  window.addEventListener('pagehide', handleUnload)
}

// Start tracking
init()
