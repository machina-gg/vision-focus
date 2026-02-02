import { useState, useEffect } from 'react';

import { checkPremiumStatus, getFeatureLimits } from '~/lib/license';
import { FEATURE_LIMITS, type FeatureLimits } from '~/types/premium';

interface PremiumStatusResult {
  isPremium: boolean;
  featureLimits: FeatureLimits;
  isLoading: boolean;
}

/**
 * Hook to check and track premium status
 */
export function usePremiumStatus(): PremiumStatusResult {
  const [isPremium, setIsPremium] = useState(false);
  const [featureLimits, setFeatureLimits] = useState<FeatureLimits>(
    FEATURE_LIMITS.free
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPremiumStatus = async () => {
      try {
        const status = await checkPremiumStatus();
        setIsPremium(status.isPremium);
        const limits = await getFeatureLimits();
        setFeatureLimits(limits);
      } finally {
        setIsLoading(false);
      }
    };
    loadPremiumStatus();
  }, []);

  return { isPremium, featureLimits, isLoading };
}
