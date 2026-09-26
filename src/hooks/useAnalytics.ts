import { useCallback, useEffect, useState } from 'react';

import { sendMessage } from '~/lib/messaging';

import { parseDomainInput, isValidDomain } from '~/lib/domain';
import {
  getSettings,
  getUnblockHistory,
  unblockHistoryItem
} from '~/lib/storage';
import type { AppSettings, UnblockHistory } from '~/types/storage';
import { DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';

interface UseAnalyticsOptions {
  setSettings: (settings: AppSettings) => void;
}

interface UseAnalyticsReturn {
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
  const [unblockHistory, setUnblockHistory] = useState<UnblockHistory>(
    DEFAULT_UNBLOCK_HISTORY
  );

  // 画面が読むのは解除履歴（一覧のブロック状態・操作の宛先）だけ。
  // 数値は activity から導出するので、ここでは旧い集計を読まない
  const reloadAnalyticsData = useCallback(async () => {
    setUnblockHistory(await getUnblockHistory());
  }, []);

  // Load analytics and unblock history on mount
  useEffect(() => {
    reloadAnalyticsData();
  }, [reloadAnalyticsData]);

  // background や他の画面が解除履歴を書き換えたら一覧を読み直す
  useEffect(() => {
    // Check if chrome.storage is available (not in test environment)
    if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
      return;
    }

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (changes.unblockHistory) {
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

  // 分析データのリセット（今日の分も含めて事実をすべて消す。追跡中のサイトの一覧は残す）。
  // 事実の表を書けるのは background だけなので、消去はメッセージで依頼する
  const handleResetAnalytics = useCallback(async () => {
    try {
      await sendMessage('reset-activity');
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
    unblockHistory,
    reloadAnalyticsData,
    handleReblock,
    handleResetAnalytics,
    handleStopTracking,
    handleRefreshAnalytics,
    handleAddSiteToTrack
  };
}
