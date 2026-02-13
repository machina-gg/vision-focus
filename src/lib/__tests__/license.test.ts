import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkPremiumStatus,
  canAccessFeature,
  getFeatureLimits,
  canAddToBlocklist
} from '~/lib/license';
import * as extpay from '~/lib/extpay';
import * as storageLib from '~/lib/storage';
import { FEATURE_LIMITS, type PremiumFeature } from '~/types/premium';

// Mock external dependencies
vi.mock('~/lib/extpay');
vi.mock('~/lib/storage');

// Mock ExtPay library to prevent browser extension errors
vi.mock('extpay', () => ({
  default: vi.fn(() => ({
    getUser: vi.fn(),
    startBackground: vi.fn(),
    openPaymentPage: vi.fn(),
    openTrialPage: vi.fn(),
    openLoginPage: vi.fn(),
    onPaid: {
      addListener: vi.fn()
    }
  }))
}));

describe('checkPremiumStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache by advancing time beyond cache duration
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns premium status when ExtensionPay reports paid', async () => {
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(true);
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const status = await checkPremiumStatus();

    expect(status).toEqual({
      isPremium: true,
      source: 'extpay'
    });
  });

  it('returns non-premium status when ExtensionPay reports not paid', async () => {
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const status = await checkPremiumStatus();

    expect(status).toEqual({
      isPremium: false,
      source: null
    });
  });

  it('caches premium status for 1 hour', async () => {
    const cachedData = {
      status: { isPremium: true, source: 'extpay' as const },
      timestamp: Date.now()
    };
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(cachedData);

    const status = await checkPremiumStatus();

    expect(status).toEqual({
      isPremium: true,
      source: 'extpay'
    });
    expect(extpay.isExtPayPremium).not.toHaveBeenCalled();
  });

  it('refreshes cache after 1 hour', async () => {
    const oldCachedData = {
      status: { isPremium: false, source: null },
      timestamp: Date.now() - 61 * 60 * 1000 // 61 minutes ago
    };
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(oldCachedData);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(true);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const status = await checkPremiumStatus();

    expect(status).toEqual({
      isPremium: true,
      source: 'extpay'
    });
    expect(extpay.isExtPayPremium).toHaveBeenCalled();
  });

  it('saves status to cache after checking', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(true);
    const setSpy = vi
      .spyOn(storageLib.storage, 'set')
      .mockResolvedValue(undefined);

    await checkPremiumStatus();

    expect(setSpy).toHaveBeenCalledWith('premiumCache', {
      status: { isPremium: true, source: 'extpay' },
      timestamp: expect.any(Number)
    });
  });

  it('uses expired cache on error if available', async () => {
    const expiredCache = {
      status: { isPremium: true, source: 'extpay' as const },
      timestamp: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
    };
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(expiredCache);
    vi.spyOn(extpay, 'isExtPayPremium').mockRejectedValue(
      new Error('Network error')
    );

    const status = await checkPremiumStatus();

    expect(status).toEqual({
      isPremium: true,
      source: 'extpay'
    });
  });

  it('returns non-premium on error with no cache', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockRejectedValue(
      new Error('Network error')
    );

    const status = await checkPremiumStatus();

    expect(status).toEqual({
      isPremium: false,
      source: null
    });
  });
});

describe('canAccessFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when user is premium', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(true);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const canAccess = await canAccessFeature('custom_background');

    expect(canAccess).toBe(true);
  });

  it('returns false when user is not premium', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const canAccess = await canAccessFeature('custom_background');

    expect(canAccess).toBe(false);
  });

  it('handles all premium feature types', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(true);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const features: PremiumFeature[] = [
      'unlimited_blocklist',
      'custom_background',
      'dashboard_presets',
      'unsplash',
      'unlimited_history',
      'weekly_report',
      'monthly_report',
      'github_integration',
      'unblock_analytics'
    ];

    for (const feature of features) {
      const canAccess = await canAccessFeature(feature);
      expect(canAccess).toBe(true);
    }
  });
});

describe('getFeatureLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns premium limits when user is premium', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(true);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const limits = await getFeatureLimits();

    expect(limits).toEqual(FEATURE_LIMITS.premium);
  });

  it('returns free limits when user is not premium', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const limits = await getFeatureLimits();

    expect(limits).toEqual(FEATURE_LIMITS.free);
  });

  it('returns limits with expected structure', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const limits = await getFeatureLimits();

    expect(limits).toHaveProperty('maxBlockList');
    expect(limits).toHaveProperty('historyDays');
    expect(limits).toHaveProperty('maxPresets');
  });
});

describe('canAddToBlocklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows adding when under free limit', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const result = await canAddToBlocklist(5);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(FEATURE_LIMITS.free.maxBlockList);
    expect(result.reason).toBeUndefined();
  });

  it('allows adding when under premium limit', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(true);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const result = await canAddToBlocklist(50);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(FEATURE_LIMITS.premium.maxBlockList);
    expect(result.reason).toBeUndefined();
  });

  it('allows adding when both limits are Infinity', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    // Both free and premium limits are Infinity for maxBlockList
    const result = await canAddToBlocklist(999999);

    expect(result.allowed).toBe(true);
  });

  it('blocks adding when at limit (theoretical case)', async () => {
    // This test demonstrates the logic even though maxBlockList is Infinity
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    // Mock FEATURE_LIMITS temporarily
    const originalLimits = FEATURE_LIMITS.free.maxBlockList;
    Object.defineProperty(FEATURE_LIMITS.free, 'maxBlockList', {
      value: 10,
      writable: true,
      configurable: true
    });

    const result = await canAddToBlocklist(10);

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(10);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain('Free tier limit reached');

    // Restore
    Object.defineProperty(FEATURE_LIMITS.free, 'maxBlockList', {
      value: originalLimits,
      writable: true,
      configurable: true
    });
  });

  it('provides upgrade message for free users at limit', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const originalLimits = FEATURE_LIMITS.free.maxBlockList;
    Object.defineProperty(FEATURE_LIMITS.free, 'maxBlockList', {
      value: 5,
      writable: true,
      configurable: true
    });

    const result = await canAddToBlocklist(5);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Upgrade to Premium');

    Object.defineProperty(FEATURE_LIMITS.free, 'maxBlockList', {
      value: originalLimits,
      writable: true,
      configurable: true
    });
  });

  it('does not provide upgrade message for premium users at limit', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(true);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const originalLimits = FEATURE_LIMITS.premium.maxBlockList;
    Object.defineProperty(FEATURE_LIMITS.premium, 'maxBlockList', {
      value: 100,
      writable: true,
      configurable: true
    });

    const result = await canAddToBlocklist(100);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeUndefined();

    Object.defineProperty(FEATURE_LIMITS.premium, 'maxBlockList', {
      value: originalLimits,
      writable: true,
      configurable: true
    });
  });

  it('handles zero count', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const result = await canAddToBlocklist(0);

    expect(result.allowed).toBe(true);
  });

  it('returns correct limit value in response', async () => {
    vi.spyOn(storageLib.storage, 'get').mockResolvedValue(undefined);
    vi.spyOn(extpay, 'isExtPayPremium').mockResolvedValue(false);
    vi.spyOn(storageLib.storage, 'set').mockResolvedValue(undefined);

    const result = await canAddToBlocklist(3);

    expect(result.limit).toBe(FEATURE_LIMITS.free.maxBlockList);
  });
});
