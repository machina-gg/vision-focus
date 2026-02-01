import { isExtPayPremium } from './extpay';
import {
  FEATURE_LIMITS,
  type FeatureLimits,
  type PremiumFeature
} from '~/types/storage';

/**
 * Check if user has premium access (via ExtensionPay)
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean;
  source: 'extpay' | null;
}> {
  // Check ExtensionPay subscription status
  try {
    const isPaid = await isExtPayPremium();
    if (isPaid) {
      return {
        isPremium: true,
        source: 'extpay'
      };
    }
  } catch {
    // Assume not premium if check fails
  }

  return {
    isPremium: false,
    source: null
  };
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
