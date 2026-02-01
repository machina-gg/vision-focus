import { useState, useEffect } from 'react';

import { sendToBackground } from '@plasmohq/messaging';

export interface BackgroundStats {
  wasteTime: number;
  investTime: number;
  blockCount: number;
  topBlockedSite: { domain: string; count: number } | null;
}

const DEFAULT_STATS: BackgroundStats = {
  wasteTime: 0,
  investTime: 0,
  blockCount: 0,
  topBlockedSite: null
};

/**
 * Hook to fetch stats from background with polling
 * @param interval - Polling interval in milliseconds (default: 10000)
 */
export function useBackgroundStats(interval = 10000): BackgroundStats {
  const [stats, setStats] = useState<BackgroundStats>(DEFAULT_STATS);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await sendToBackground({ name: 'get-stats' });
        setStats(response);
      } catch {
        // Silently handle error - stats will refresh on next interval
      }
    };

    fetchStats();
    const intervalId = setInterval(fetchStats, interval);
    return () => clearInterval(intervalId);
  }, [interval]);

  return stats;
}
