import { useState, useEffect, useCallback } from 'react';

import { sendMessage } from '~/lib/messaging';

import { DOMAIN_POLLING_MS } from '~/constants/intervals';
import { getActiveTab } from '~/lib/chromeApi';
import { extractDomain } from '~/lib/domain';
import type { TimeLimitType } from '~/types/storage';

export interface TimeLimitInfo {
  hasTimeLimit: boolean;
  remainingSeconds: number | null;
  limitType: TimeLimitType | null;
  limitSeconds: number | null;
}

export interface UseCurrentDomainReturn {
  currentDomain: string | undefined;
  timeLimitInfo: TimeLimitInfo | null;
  clearDomain: () => void;
}

/**
 * Hook to detect the current tab's domain and poll for time limit info
 */
export function useCurrentDomain(): UseCurrentDomainReturn {
  const [currentDomain, setCurrentDomain] = useState<string | undefined>();
  const [timeLimitInfo, setTimeLimitInfo] = useState<TimeLimitInfo | null>(
    null
  );

  const clearDomain = useCallback(() => {
    setCurrentDomain(undefined);
  }, []);

  useEffect(() => {
    const getCurrentDomainAndTimeLimit = async () => {
      try {
        const tab = await getActiveTab();
        if (tab?.url) {
          const domain = extractDomain(tab.url);
          setCurrentDomain(domain || undefined);

          // Get time limit info for this URL
          if (tab.url) {
            const response = await sendMessage('get-remaining-time', {
              url: tab.url
            });
            if (response.success && response.data) {
              setTimeLimitInfo(response.data);
            }
          }
        }
      } catch {
        // Silently handle error - domain will be undefined
      }
    };

    getCurrentDomainAndTimeLimit();

    // Refresh time limit info periodically
    const interval = setInterval(
      getCurrentDomainAndTimeLimit,
      DOMAIN_POLLING_MS
    );
    return () => clearInterval(interval);
  }, []);

  return { currentDomain, timeLimitInfo, clearDomain };
}
