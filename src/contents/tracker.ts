import type { PlasmoCSConfig } from 'plasmo'
import { sendToBackground } from '@plasmohq/messaging'

// Run on all pages
export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_idle',
}

// Tracking state
let heartbeatInterval: ReturnType<typeof setInterval> | null = null
let isStopped = false

// Heartbeat interval (send heartbeat every 5 seconds when visible)
const HEARTBEAT_INTERVAL_MS = 5 * 1000

// Check if extension context is still valid
function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id
  } catch {
    return false
  }
}

// Send heartbeat to background
async function sendHeartbeat(status: 'active' | 'inactive' | 'heartbeat') {
  if (isStopped) return

  // Check if extension context is still valid
  if (!isContextValid()) {
    stopTracking()
    return
  }

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
    // Extension context likely invalidated, stop tracking
    stopTracking()
  }
}

// Handle visibility change
function handleVisibilityChange() {
  if (isStopped || !isContextValid()) {
    stopTracking()
    return
  }

  if (document.hidden) {
    // Page is hidden, notify background
    sendHeartbeat('inactive')
  } else {
    // Page is visible again
    sendHeartbeat('active')
  }
}

// Start tracking
function startTracking() {
  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Start heartbeat interval
  heartbeatInterval = setInterval(() => {
    // Stop if context invalidated
    if (!isContextValid()) {
      stopTracking()
      return
    }

    // Send heartbeat if page is visible (simple visibility-based tracking)
    if (!document.hidden) {
      sendHeartbeat('heartbeat')
    }
  }, HEARTBEAT_INTERVAL_MS)

  // Initial heartbeat if page is visible
  if (!document.hidden) {
    sendHeartbeat('active')
  }
}

// Stop tracking
function stopTracking() {
  if (isStopped) return
  isStopped = true

  // Remove visibility listener
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // Clear interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
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
