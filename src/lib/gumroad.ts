import {
  activatePremiumLicense,
  deactivateLicense,
  hashLicenseKey,
  recordVerificationFailure,
  resetVerificationFailures,
} from './license'
import { getLicense } from './storage'
import type { LicenseType } from '~/types/storage'

// Gumroad API endpoint
const GUMROAD_API_URL = 'https://api.gumroad.com/v2/licenses/verify'

// Product permalinks for different license types
// These should be configured when setting up Gumroad products
const PRODUCT_PERMALINKS = {
  monthly: process.env.PLASMO_PUBLIC_GUMROAD_MONTHLY_PRODUCT || 'visionfocus-monthly',
  yearly: process.env.PLASMO_PUBLIC_GUMROAD_YEARLY_PRODUCT || 'visionfocus-yearly',
  lifetime: process.env.PLASMO_PUBLIC_GUMROAD_LIFETIME_PRODUCT || 'visionfocus-lifetime',
} as const

// Response type from Gumroad API
interface GumroadVerifyResponse {
  success: boolean
  uses: number
  purchase: {
    seller_id: string
    product_id: string
    product_name: string
    permalink: string
    product_permalink: string
    email: string
    price: number
    gumroad_fee: number
    currency: string
    quantity: number
    discover_fee_charged: boolean
    can_contact: boolean
    referrer: string
    card: {
      visual: string
      type: string
      bin: string
      expiry_month: string
      expiry_year: string
    }
    order_number: number
    sale_id: string
    sale_timestamp: string
    purchaser_id: string
    subscription_id?: string
    variants: string
    test: boolean
    license_key: string
    ip_country: string
    is_gift_receiver_purchase: boolean
    refunded: boolean
    disputed: boolean
    dispute_won: boolean
    id: string
    created_at: string
    custom_fields: Record<string, string>
    chargedback: boolean
    subscription_ended_at?: string
    subscription_cancelled_at?: string
    subscription_failed_at?: string
  }
  message?: string
}

/**
 * Determine license type from Gumroad product permalink
 */
function getLicenseTypeFromPermalink(permalink: string): LicenseType {
  if (permalink.includes('lifetime')) return 'lifetime'
  if (permalink.includes('yearly')) return 'yearly'
  if (permalink.includes('monthly')) return 'monthly'
  return 'monthly' // default
}

/**
 * Calculate expiration date based on license type
 */
function calculateExpirationDate(
  type: LicenseType,
  purchaseDate: string
): string | null {
  if (type === 'lifetime') return null

  const date = new Date(purchaseDate)
  if (type === 'yearly') {
    date.setFullYear(date.getFullYear() + 1)
  } else {
    date.setMonth(date.getMonth() + 1)
  }
  return date.toISOString()
}

/**
 * Verify license key with Gumroad API
 */
export async function verifyLicenseKey(licenseKey: string): Promise<{
  valid: boolean
  type?: LicenseType
  expiresAt?: string | null
  error?: string
}> {
  // Try each product permalink until we find a match
  for (const [type, permalink] of Object.entries(PRODUCT_PERMALINKS)) {
    try {
      const response = await fetch(GUMROAD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          product_permalink: permalink,
          license_key: licenseKey,
        }),
      })

      const data: GumroadVerifyResponse = await response.json()

      if (data.success && data.purchase) {
        // Check if purchase is valid (not refunded, disputed, or chargedback)
        if (
          data.purchase.refunded ||
          data.purchase.disputed ||
          data.purchase.chargedback
        ) {
          continue // Try next product
        }

        // For subscriptions, check if still active
        if (
          data.purchase.subscription_ended_at ||
          data.purchase.subscription_cancelled_at ||
          data.purchase.subscription_failed_at
        ) {
          const endDate = new Date(
            data.purchase.subscription_ended_at ||
              data.purchase.subscription_cancelled_at ||
              data.purchase.subscription_failed_at!
          )
          if (endDate < new Date()) {
            return {
              valid: false,
              error: 'Subscription has ended or been cancelled',
            }
          }
        }

        const licenseType = getLicenseTypeFromPermalink(
          data.purchase.product_permalink
        )
        const expiresAt = calculateExpirationDate(
          licenseType,
          data.purchase.sale_timestamp
        )

        return {
          valid: true,
          type: licenseType,
          expiresAt,
        }
      }
    } catch {
      // Network error, try next product
      continue
    }
  }

  return {
    valid: false,
    error: 'Invalid license key',
  }
}

/**
 * Activate license from Gumroad key
 */
export async function activateGumroadLicense(licenseKey: string): Promise<{
  success: boolean
  error?: string
}> {
  const verification = await verifyLicenseKey(licenseKey)

  if (!verification.valid) {
    return {
      success: false,
      error: verification.error || 'Invalid license key',
    }
  }

  const keyHash = await hashLicenseKey(licenseKey)

  await activatePremiumLicense({
    type: verification.type!,
    source: 'gumroad',
    licenseKeyHash: keyHash,
    expiresAt: verification.expiresAt || null,
  })

  return { success: true }
}

/**
 * Verify currently stored license (for periodic checks)
 */
export async function verifyStoredLicense(): Promise<{
  valid: boolean
  error?: string
}> {
  const license = await getLicense()

  // No license to verify
  if (!license.isPremium || !license.licenseKey) {
    return { valid: false, error: 'No active license' }
  }

  // Skip verification for dev/promo licenses
  if (license.source !== 'gumroad') {
    return { valid: true }
  }

  // For lifetime licenses, no need to verify frequently
  if (license.type === 'lifetime') {
    // Only verify if last verification was more than 30 days ago
    if (license.lastVerifiedAt) {
      const lastVerified = new Date(license.lastVerifiedAt)
      const daysSinceVerified =
        (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceVerified < 30) {
        return { valid: true }
      }
    }
  }

  // We can't re-verify without the original key (we only store hash)
  // So we just check if the expiration is still valid
  if (license.expiresAt) {
    const expiresAt = new Date(license.expiresAt)
    if (expiresAt < new Date()) {
      // License expired
      await recordVerificationFailure()
      return { valid: false, error: 'License expired' }
    }
  }

  // Reset failures on successful check
  await resetVerificationFailures()
  return { valid: true }
}

/**
 * Handle offline verification
 * Returns true if we should allow access even when offline
 */
export async function handleOfflineVerification(): Promise<boolean> {
  const license = await getLicense()

  // No premium license
  if (!license.isPremium) {
    return false
  }

  // Lifetime licenses always work offline
  if (license.type === 'lifetime') {
    return true
  }

  // Check if within expiration
  if (license.expiresAt) {
    const expiresAt = new Date(license.expiresAt)
    if (expiresAt > new Date()) {
      return true
    }
  }

  // Check grace period
  if (license.gracePeriodEndsAt) {
    const gracePeriodEndsAt = new Date(license.gracePeriodEndsAt)
    if (gracePeriodEndsAt > new Date()) {
      return true
    }
  }

  return false
}

/**
 * Get Gumroad purchase URL for upgrade
 */
export function getGumroadPurchaseUrl(type: 'monthly' | 'yearly' | 'lifetime' = 'lifetime'): string {
  const permalink = PRODUCT_PERMALINKS[type]
  return `https://gumroad.com/l/${permalink}`
}
