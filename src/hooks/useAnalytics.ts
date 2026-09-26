import { useCallback, useEffect, useState } from 'react';

import { sendMessage } from '~/lib/messaging';

import { parseDomainInput, isValidDomain } from '~/lib/domain';
import {
  analyticsItem,
  getAnalytics,
  getSettings,
  getUnblockHistory,
  unblockHistoryItem
} from '~/lib/storage';
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
    siteBlockCounts: {},
    siteUnblockCounts: {}
  });

  const [unblockHistory, setUnblockHistory] = useState<UnblockHistory>(
    DEFAULT_UNBLOCK_HISTORY
  );

  // Helper function to reload analytics data
  const reloadAnalyticsData = useCallback(async () => {
    const [analyticsResult, unblockResult] = await Promise.all([
      getAnalytics(),
      getUnblockHistory()
    ]);
    setAnalyticsData(analyticsResult);
    setUnblockHistory(unblockResult);
  }, []);

  // Load analytics and unblock history on mount
  useEffect(() => {
    reloadAnalyticsData();
  }, [reloadAnalyticsData]);

  // Listen for storage changes to unblockHistory and analytics
  // This ensures UI updates when background scripts modify the data
  useEffect(() => {
    // Check if chrome.storage is available (not in test environment)
    if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
      return;
    }

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      // Check if unblockHistory or analytics changed
      if (changes.unblockHistory || changes.analytics) {
        reloadAnalyticsData();
      }
    };

    // Add listener for local storage changes
    chrome.storage.local.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.local.onChanged.removeListener(handleStorageChange);
    };
  }, [reloadAnalyticsData]);

  // Re-block handler
  const handleReblock = useCallback(
    async (domain: string) => {
      try {
        await sendMessage('add-block', { domain });
        // Refresh data after re-blocking
        await reloadAnalyticsData();
        setSettings(await getSettings());
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
      const currentHistory = await getUnblockHistory();
      const resetHistory: UnblockHistory = {
        sites: Object.fromEntries(
          Object.entries(currentHistory.sites).map(([domain, site]) => [
            domain,
            { ...site, timeAfterUnblock: 0, lastActivity: null }
          ])
        )
      };
      await unblockHistoryItem.setValue(resetHistory);
      setUnblockHistory(resetHistory);

      // Clear analytics data
      const emptyAnalytics: AnalyticsData = {
        dailyStats: {},
        siteTime: {},
        siteCategories: {},
        siteBlockCounts: {},
        siteUnblockCounts: {}
      };
      await analyticsItem.setValue(emptyAnalytics);
      setAnalyticsData(emptyAnalytics);
    } catch {
      // Silently handle error
    }
  }, []);

  // Stop tracking a site (remove from unblock history)
  const handleStopTracking = useCallback(async (domain: string) => {
    try {
      const currentHistory = await getUnblockHistory();
      if (currentHistory.sites[domain]) {
        const { [domain]: _, ...remainingSites } = currentHistory.sites;
        const updatedHistory: UnblockHistory = { sites: remainingSites };
        await unblockHistoryItem.setValue(updatedHistory);
        setUnblockHistory(updatedHistory);

        // Also remove from analytics siteTime
        const currentAnalytics = await getAnalytics();
        if (currentAnalytics.siteTime[domain]) {
          const { [domain]: __, ...remainingSiteTime } =
            currentAnalytics.siteTime;
          const updatedAnalytics: AnalyticsData = {
            ...currentAnalytics,
            siteTime: remainingSiteTime
          };
          await analyticsItem.setValue(updatedAnalytics);
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

      const current = await getUnblockHistory();

      // Don't add if already tracking
      if (current.sites[parsedDomain]) {
        return;
      }

      // 未保存のときの戻り値は共有の既定値なので、破壊的に書き換えず新しい履歴を組む
      const history: UnblockHistory = {
        sites: {
          ...current.sites,
          [parsedDomain]: {
            domain: parsedDomain,
            status: 'unblocked',
            blockedAt: new Date().toISOString(),
            unblockedAt: new Date().toISOString(),
            timeAfterUnblock: 0,
            lastActivity: null
          }
        }
      };
      await unblockHistoryItem.setValue(history);
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
