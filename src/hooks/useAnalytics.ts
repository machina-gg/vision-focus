import { useCallback, useState } from 'react';

import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';
import type { TrackedSite } from '~/types/site';

interface UseAnalyticsReturn {
  /** 追跡サイトの追加に失敗したときの文言。失敗していなければ空文字 */
  addSiteError: string;
  /** サイトをブロックに戻す（ブロック設定が無ければ追加し、無効なら有効にする） */
  handleReblock: (site: TrackedSite) => Promise<void>;
  /** 活動の記録をすべて消す */
  handleResetAnalytics: () => Promise<void>;
  /** サイトの追跡をやめ、その記録を消す */
  handleStopTracking: (site: TrackedSite) => Promise<void>;
  /** 何もしない（表示は保存値の変更に追従するため） */
  handleRefreshAnalytics: () => Promise<void>;
  /** 入力されたドメインを追跡対象に加える。加えられたら true */
  handleAddSiteToTrack: (domain: string) => Promise<boolean>;
}

/**
 * 分析タブの操作（再ブロック・記録のリセット・追跡の停止・追跡サイトの追加）を background へ依頼する
 * @returns 各操作と、追跡サイトの追加の失敗の文言
 */
export function useAnalytics(): UseAnalyticsReturn {
  const [addSiteError, setAddSiteError] = useState('');

  // add-block は既存のブロック設定を重複として拒否するので、無効にしたサイトはトグルで戻す
  const handleReblock = useCallback(async (site: TrackedSite) => {
    try {
      if (site.block === null) {
        await sendMessage('add-block', { domain: site.domain });
      } else if (!site.block.enabled) {
        await sendMessage('toggle-block', {
          domain: site.domain,
          enabled: true
        });
      }
    } catch {
      // Silently handle error
    }
  }, []);

  const handleResetAnalytics = useCallback(async () => {
    try {
      await sendMessage('reset-activity');
    } catch {
      // Silently handle error
    }
  }, []);

  const handleStopTracking = useCallback(async (site: TrackedSite) => {
    try {
      await sendMessage('stop-tracking', { domain: site.domain });
    } catch {
      // Silently handle error
    }
  }, []);

  const handleRefreshAnalytics = useCallback(async () => {}, []);

  const handleAddSiteToTrack = useCallback(async (domain: string) => {
    try {
      const response = await sendMessage('add-tracked-site', { domain });
      if (!response.success) {
        setAddSiteError(messageErrorText(response.error));
        return false;
      }
      setAddSiteError('');
      return true;
    } catch {
      setAddSiteError(messageErrorText(undefined));
      return false;
    }
  }, []);

  return {
    addSiteError,
    handleReblock,
    handleResetAnalytics,
    handleStopTracking,
    handleRefreshAnalytics,
    handleAddSiteToTrack
  };
}
