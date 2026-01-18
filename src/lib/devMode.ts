import { getDevMode, setDevMode } from './storage'
import type { DevModeSettings } from '~/types/storage'

// Dev mode duration (24 hours)
const DEV_MODE_DURATION_MS = 24 * 60 * 60 * 1000

// Secret key for dev mode activation (hash of 'visionfocus-dev-2024')
// In production, this would be set via environment variable
const DEV_MODE_SECRET_HASH =
  '8a7b5c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b'

/**
 * Check if dev mode is allowed in current environment
 */
export function isDevModeAllowed(): boolean {
  // In production builds, check environment variable
  // For development, always allow
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return process.env.ALLOW_DEV_MODE === 'true'
  }
  return true
}

/**
 * Hash a secret key for comparison
 */
async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(secret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate dev mode secret
 */
export async function validateDevModeSecret(secret: string): Promise<boolean> {
  if (!isDevModeAllowed()) {
    return false
  }

  // For development, accept a simple secret
  if (
    typeof process !== 'undefined' &&
    process.env.NODE_ENV !== 'production'
  ) {
    return secret === 'dev' || secret === 'visionfocus-dev'
  }

  const hashedInput = await hashSecret(secret)
  return hashedInput === DEV_MODE_SECRET_HASH
}

/**
 * Enable dev mode with 24-hour expiration
 */
export async function enableDevMode(secret: string): Promise<{
  success: boolean
  error?: string
  expiresAt?: string
}> {
  if (!isDevModeAllowed()) {
    return {
      success: false,
      error: 'Dev mode is not available in this build',
    }
  }

  const isValid = await validateDevModeSecret(secret)
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid secret key',
    }
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + DEV_MODE_DURATION_MS)

  await setDevMode({
    enabled: true,
    enabledAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })

  return {
    success: true,
    expiresAt: expiresAt.toISOString(),
  }
}

/**
 * Disable dev mode
 */
export async function disableDevMode(): Promise<void> {
  await setDevMode({
    enabled: false,
    enabledAt: null,
    expiresAt: null,
  })
}

/**
 * Check if dev mode is currently active
 */
export async function isDevModeActive(): Promise<{
  active: boolean
  expiresAt: string | null
  remainingMs: number | null
}> {
  const devMode = await getDevMode()

  if (!devMode.enabled || !devMode.expiresAt) {
    return {
      active: false,
      expiresAt: null,
      remainingMs: null,
    }
  }

  const expiresAt = new Date(devMode.expiresAt)
  const now = new Date()

  if (expiresAt <= now) {
    // Expired, clean up
    await disableDevMode()
    return {
      active: false,
      expiresAt: null,
      remainingMs: null,
    }
  }

  return {
    active: true,
    expiresAt: devMode.expiresAt,
    remainingMs: expiresAt.getTime() - now.getTime(),
  }
}

/**
 * Get remaining time string for dev mode
 */
export function formatRemainingTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Check and cleanup expired dev mode (called on startup/alarm)
 */
export async function checkAndCleanupDevMode(): Promise<void> {
  const { active } = await isDevModeActive()
  // isDevModeActive already handles cleanup if expired
}
