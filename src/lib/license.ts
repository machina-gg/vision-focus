import { getDevMode, getLicense, setLicense } from './storage'
import {
  FEATURE_LIMITS,
  type FeatureLimits,
  type LicenseInfo,
  type LicenseType,
  type PremiumFeature,
} from '~/types/storage'

// Grace period duration (7 days)
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

// Max verification failures before suspending premium
const MAX_VERIFICATION_FAILURES = 3

/**
 * Check if user has premium access (considering license, devMode, and grace period)
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean
  source: 'license' | 'devMode' | 'gracePeriod' | null
  expiresAt: string | null
}> {
  // First check devMode
  const devMode = await getDevMode()
  if (devMode.enabled && devMode.expiresAt) {
    const expiresAt = new Date(devMode.expiresAt)
    if (expiresAt > new Date()) {
      return {
        isPremium: true,
        source: 'devMode',
        expiresAt: devMode.expiresAt,
      }
    }
  }

  // Then check license
  const license = await getLicense()

  // Check if license is valid
  if (license.isPremium) {
    // Check expiration for non-lifetime licenses
    if (license.type !== 'lifetime' && license.expiresAt) {
      const expiresAt = new Date(license.expiresAt)
      if (expiresAt > new Date()) {
        return {
          isPremium: true,
          source: 'license',
          expiresAt: license.expiresAt,
        }
      }
    } else if (license.type === 'lifetime') {
      return {
        isPremium: true,
        source: 'license',
        expiresAt: null,
      }
    }
  }

  // Check grace period
  if (license.gracePeriodEndsAt) {
    const gracePeriodEndsAt = new Date(license.gracePeriodEndsAt)
    if (gracePeriodEndsAt > new Date()) {
      return {
        isPremium: true,
        source: 'gracePeriod',
        expiresAt: license.gracePeriodEndsAt,
      }
    }
  }

  return {
    isPremium: false,
    source: null,
    expiresAt: null,
  }
}

/**
 * Check if user can access a specific premium feature
 */
export async function canAccessFeature(
  feature: PremiumFeature
): Promise<boolean> {
  const { isPremium } = await checkPremiumStatus()
  return isPremium
}

/**
 * Get current feature limits based on premium status
 */
export async function getFeatureLimits(): Promise<FeatureLimits> {
  const { isPremium } = await checkPremiumStatus()
  return isPremium ? FEATURE_LIMITS.premium : FEATURE_LIMITS.free
}

/**
 * Check if user can add more items to blocklist
 */
export async function canAddToBlocklist(
  currentCount: number
): Promise<{ allowed: boolean; limit: number; reason?: string }> {
  const limits = await getFeatureLimits()
  const { isPremium } = await checkPremiumStatus()

  if (currentCount >= limits.maxBlockList) {
    return {
      allowed: false,
      limit: limits.maxBlockList,
      reason: isPremium
        ? undefined
        : `Free tier limit reached (${limits.maxBlockList} sites). Upgrade to Premium for unlimited sites.`,
    }
  }

  return {
    allowed: true,
    limit: limits.maxBlockList,
  }
}

/**
 * Start grace period when license verification fails
 */
export async function startGracePeriod(): Promise<void> {
  const license = await getLicense()

  // Only start grace period if we had a valid premium before
  if (license.isPremium && !license.gracePeriodEndsAt) {
    const gracePeriodEndsAt = new Date(Date.now() + GRACE_PERIOD_MS)
    await setLicense({
      ...license,
      gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
    })
  }
}

/**
 * Record a verification failure
 */
export async function recordVerificationFailure(): Promise<{
  suspended: boolean
  failCount: number
}> {
  const license = await getLicense()
  const newFailCount = license.verificationFailCount + 1

  await setLicense({
    ...license,
    verificationFailCount: newFailCount,
  })

  // If we've exceeded max failures, start grace period
  if (newFailCount >= MAX_VERIFICATION_FAILURES) {
    await startGracePeriod()
    return { suspended: true, failCount: newFailCount }
  }

  return { suspended: false, failCount: newFailCount }
}

/**
 * Reset verification failure count (called on successful verification)
 */
export async function resetVerificationFailures(): Promise<void> {
  const license = await getLicense()

  if (
    license.verificationFailCount > 0 ||
    license.gracePeriodEndsAt !== null
  ) {
    await setLicense({
      ...license,
      verificationFailCount: 0,
      gracePeriodEndsAt: null,
      lastVerifiedAt: new Date().toISOString(),
    })
  }
}

/**
 * Activate premium license
 */
export async function activatePremiumLicense(params: {
  type: LicenseType
  source: 'gumroad' | 'dev' | 'promo'
  licenseKeyHash: string | null
  expiresAt: string | null
}): Promise<void> {
  const license = await getLicense()

  await setLicense({
    ...license,
    isPremium: true,
    type: params.type,
    source: params.source,
    licenseKey: params.licenseKeyHash,
    expiresAt: params.expiresAt,
    activatedAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    verificationFailCount: 0,
    gracePeriodEndsAt: null,
  })
}

/**
 * Deactivate premium license
 */
export async function deactivateLicense(): Promise<void> {
  const license = await getLicense()

  await setLicense({
    ...license,
    isPremium: false,
    type: 'free',
    source: null,
    licenseKey: null,
    expiresAt: null,
    activatedAt: null,
    lastVerifiedAt: null,
    verificationFailCount: 0,
    gracePeriodEndsAt: null,
  })
}

/**
 * Hash a license key for storage (we don't store plain keys)
 */
export async function hashLicenseKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
