import { isExtPayPremium } from './extpay';
import { storage } from './storage';
import {
  FEATURE_LIMITS,
  type FeatureLimits,
  type PremiumFeature
} from '~/types/premium';

/** Cache duration: 1 hour */
const CACHE_DURATION = 60 * 60 * 1000;

interface PremiumCache {
  status: {
    isPremium: boolean;
    source: 'extpay' | null;
  };
  timestamp: number;
}

/**
 * Check if user has premium access (via ExtensionPay)
 * Results are cached for 1 hour to reduce API calls
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean;
  source: 'extpay' | null;
}> {
  // Check cache first
  const cached = (await storage.get('premiumCache')) as
    | PremiumCache
    | undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.status;
  }

  // Check ExtensionPay subscription status
  try {
    const isPaid = await isExtPayPremium();
    const status = {
      isPremium: isPaid,
      source: (isPaid ? 'extpay' : null) as 'extpay' | null
    };

    // Save to cache
    await storage.set('premiumCache', {
      status,
      timestamp: Date.now()
    });

    return status;
  } catch {
    // On error, use previous cache if available (even if expired)
    if (cached) {
      return cached.status;
    }
    return {
      isPremium: false,
      source: null
    };
  }
}

/**
 * Check if user can access a specific premium feature
 */
export async function canAccessFeature(
  _feature: PremiumFeature
): Promise<boolean> {
  const { isPremium } = await checkPremiumStatus();
  return isPremium;
}

/**
 * Get current feature limits based on premium status
 */
export async function getFeatureLimits(): Promise<FeatureLimits> {
  const { isPremium } = await checkPremiumStatus();
  return isPremium ? FEATURE_LIMITS.premium : FEATURE_LIMITS.free;
}

/**
 * Check if user can add more items to blocklist
 */
export async function canAddToBlocklist(
  currentCount: number
): Promise<{ allowed: boolean; limit: number; reason?: string }> {
  const limits = await getFeatureLimits();
  const { isPremium } = await checkPremiumStatus();

  if (currentCount >= limits.maxBlockList) {
    return {
      allowed: false,
      limit: limits.maxBlockList,
      reason: isPremium
        ? undefined
        : `Free tier limit reached (${limits.maxBlockList} sites). Upgrade to Premium for unlimited sites.`
    };
  }

  return {
    allowed: true,
    limit: limits.maxBlockList
  };
}
