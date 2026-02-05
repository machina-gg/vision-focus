import { useState, useEffect, useCallback } from 'react';

import { sendToBackground } from '@plasmohq/messaging';

import { getActiveTab } from '~/lib/chromeApi';
import { extractDomain } from '~/lib/domain';

const POLLING_INTERVAL_MS = 10000;

export interface TimeLimitInfo {
  hasTimeLimit: boolean;
  remainingSeconds: number | null;
  limitType: 'daily' | 'hourly' | null;
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
            const response = await sendToBackground({
              name: 'get-remaining-time',
              body: { url: tab.url }
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
      POLLING_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, []);

  return { currentDomain, timeLimitInfo, clearDomain };
}
