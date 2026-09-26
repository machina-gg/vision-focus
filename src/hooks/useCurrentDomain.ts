import { useState, useEffect, useCallback } from 'react';

import { sendMessage } from '~/lib/messaging';

import { DOMAIN_POLLING_MS } from '~/constants/intervals';
import { getActiveTab } from '~/lib/chromeApi';
import { extractDomain } from '~/lib/domain';
import type { TimeLimitInfo } from '~/types/messages';

export interface UseCurrentDomainReturn {
  /** アクティブなタブのドメイン。取得できなければ undefined */
  currentDomain: string | undefined;
  /** そのドメインの時間制限。取得できるまでは null */
  timeLimitInfo: TimeLimitInfo | null;
  /** currentDomain を undefined に戻す（次のポーリングで再取得される） */
  clearDomain: () => void;
}

/** アクティブなタブのドメインとその時間制限を定期的に取得する */
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

    const interval = setInterval(
      getCurrentDomainAndTimeLimit,
      DOMAIN_POLLING_MS
    );
    return () => clearInterval(interval);
  }, []);

  return { currentDomain, timeLimitInfo, clearDomain };
}
