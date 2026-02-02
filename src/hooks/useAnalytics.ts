import { useCallback, useEffect, useState } from 'react';

import { sendToBackground } from '@plasmohq/messaging';

import { parseDomainInput, isValidDomain } from '~/lib/domain';
import { storage } from '~/lib/storage';
import type {
  AppSettings,
  AnalyticsData,
  UnblockHistory
} from '~/types/storage';
import { DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';

interface UseAnalyticsOptions {
  setSettings: (settings: AppSettings) => void;
}

interface UseAnalyticsReturn {
  analyticsData: AnalyticsData;
  unblockHistory: UnblockHistory;
  reloadAnalyticsData: () => Promise<void>;
  handleReblock: (domain: string) => Promise<void>;
  handleResetAnalytics: () => Promise<void>;
  handleStopTracking: (domain: string) => Promise<void>;
  handleRefreshAnalytics: () => Promise<void>;
  handleAddSiteToTrack: (domain: string) => Promise<void>;
}

export function useAnalytics({
  setSettings
}: UseAnalyticsOptions): UseAnalyticsReturn {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    dailyStats: {},
    siteTime: {},
    siteCategories: {},
    siteBlockCounts: {}
  });

  const [unblockHistory, setUnblockHistory] = useState<UnblockHistory>(
    DEFAULT_UNBLOCK_HISTORY
  );

  // Helper function to reload analytics data
  const reloadAnalyticsData = useCallback(async () => {
    const [analyticsResult, unblockResult] = await Promise.all([
      storage.get('analytics') as Promise<AnalyticsData | undefined>,
      storage.get('unblockHistory') as Promise<UnblockHistory | undefined>
    ]);
    if (analyticsResult) {
      setAnalyticsData(analyticsResult);
    }
    if (unblockResult) {
      setUnblockHistory(unblockResult);
    }
  }, []);

  // Load analytics and unblock history on mount
  useEffect(() => {
    reloadAnalyticsData();
  }, [reloadAnalyticsData]);

  // Re-block handler
  const handleReblock = useCallback(
    async (domain: string) => {
      try {
        await sendToBackground({
          name: 'add-block',
          body: { domain }
        });
        // Refresh data after re-blocking
        await reloadAnalyticsData();
        const settingsResult = (await storage.get('settings')) as
          | AppSettings
          | undefined;
        if (settingsResult) {
          setSettings(settingsResult);
        }
      } catch {
        // Silently handle error
      }
    },
    [setSettings, reloadAnalyticsData]
  );

  // Reset analytics handler (reset time only, keep site list)
  const handleResetAnalytics = useCallback(async () => {
    try {
      // Reset time for all sites but keep the list
      const currentHistory = (await storage.get('unblockHistory')) as
        | UnblockHistory
        | undefined;
      if (currentHistory) {
        const resetHistory: UnblockHistory = {
          sites: Object.fromEntries(
            Object.entries(currentHistory.sites).map(([domain, site]) => [
              domain,
              { ...site, timeAfterUnblock: 0, lastActivity: null }
            ])
          )
        };
        await storage.set('unblockHistory', resetHistory);
        setUnblockHistory(resetHistory);
      }

      // Clear analytics data
      const emptyAnalytics: AnalyticsData = {
        dailyStats: {},
        siteTime: {},
        siteCategories: {},
        siteBlockCounts: {}
      };
      await storage.set('analytics', emptyAnalytics);
      setAnalyticsData(emptyAnalytics);
    } catch {
      // Silently handle error
    }
  }, []);

  // Stop tracking a site (remove from unblock history)
  const handleStopTracking = useCallback(async (domain: string) => {
    try {
      const currentHistory = (await storage.get('unblockHistory')) as
        | UnblockHistory
        | undefined;
      if (currentHistory && currentHistory.sites[domain]) {
        const { [domain]: _, ...remainingSites } = currentHistory.sites;
        const updatedHistory: UnblockHistory = { sites: remainingSites };
        await storage.set('unblockHistory', updatedHistory);
        setUnblockHistory(updatedHistory);

        // Also remove from analytics siteTime
        const currentAnalytics = (await storage.get('analytics')) as
          | AnalyticsData
          | undefined;
        if (currentAnalytics && currentAnalytics.siteTime[domain]) {
          const { [domain]: __, ...remainingSiteTime } =
            currentAnalytics.siteTime;
          const updatedAnalytics: AnalyticsData = {
            ...currentAnalytics,
            siteTime: remainingSiteTime
          };
          await storage.set('analytics', updatedAnalytics);
          setAnalyticsData(updatedAnalytics);
        }
      }
    } catch {
      // Silently handle error
    }
  }, []);

  // Refresh analytics data
  const handleRefreshAnalytics = useCallback(async () => {
    try {
      await reloadAnalyticsData();
    } catch {
      // Silently handle error
    }
  }, [reloadAnalyticsData]);

  // Add site to track manually
  const handleAddSiteToTrack = useCallback(async (domain: string) => {
    try {
      // Validate and parse domain
      const { domain: parsedDomain } = parseDomainInput(domain);
      if (!isValidDomain(parsedDomain)) {
        return; // Invalid domain format
      }

      const currentHistory = (await storage.get('unblockHistory')) as
        | UnblockHistory
        | undefined;
      const history = currentHistory || { sites: {} };

      // Don't add if already tracking
      if (history.sites[parsedDomain]) {
        return;
      }

      history.sites[parsedDomain] = {
        domain: parsedDomain,
        status: 'unblocked',
        blockedAt: new Date().toISOString(),
        unblockedAt: new Date().toISOString(),
        timeAfterUnblock: 0,
        lastActivity: null
      };
      await storage.set('unblockHistory', history);
      setUnblockHistory(history);
    } catch {
      // Silently handle error
    }
  }, []);

  return {
    analyticsData,
    unblockHistory,
    reloadAnalyticsData,
    handleReblock,
    handleResetAnalytics,
    handleStopTracking,
    handleRefreshAnalytics,
    handleAddSiteToTrack
  };
}
