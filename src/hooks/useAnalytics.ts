import { useCallback } from 'react';

import { sendMessage } from '~/lib/messaging';

interface UseAnalyticsReturn {
  handleReblock: (domain: string) => Promise<void>;
  handleResetAnalytics: () => Promise<void>;
  handleStopTracking: (domain: string) => Promise<void>;
  handleRefreshAnalytics: () => Promise<void>;
  handleAddSiteToTrack: (domain: string) => Promise<void>;
}

/**
 * 分析タブの操作。追跡中のサイトと事実の表を書けるのは background だけなので、
 * どの操作もメッセージで依頼する。表示する値は画面が保存値を監視して追従する
 */
export function useAnalytics(): UseAnalyticsReturn {
  const handleReblock = useCallback(async (domain: string) => {
    try {
      await sendMessage('add-block', { domain });
    } catch {
      // Silently handle error
    }
  }, []);

  // 分析データのリセット（今日の分も含めて事実をすべて消す。追跡中のサイトの一覧は残す）
  const handleResetAnalytics = useCallback(async () => {
    try {
      await sendMessage('reset-activity');
    } catch {
      // Silently handle error
    }
  }, []);

  // 追跡を止める（サイトとその事実を消す）
  const handleStopTracking = useCallback(async (domain: string) => {
    try {
      await sendMessage('stop-tracking', { domain });
    } catch {
      // Silently handle error
    }
  }, []);

  // 表示する値は保存値の監視で常に最新なので、読み直すものは無い
  const handleRefreshAnalytics = useCallback(async () => {}, []);

  // ブロックせずに追跡だけを始める（形式の誤り・入れ子は background が拒否する）
  const handleAddSiteToTrack = useCallback(async (domain: string) => {
    try {
      await sendMessage('add-tracked-site', { domain });
    } catch {
      // Silently handle error
    }
  }, []);

  return {
    handleReblock,
    handleResetAnalytics,
    handleStopTracking,
    handleRefreshAnalytics,
    handleAddSiteToTrack
  };
}
