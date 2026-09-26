import { useCallback, useState } from 'react';

import { sendMessage } from '~/lib/messaging';
import type { TrackedSite } from '~/types/site';

interface UseAnalyticsReturn {
  /** 追跡サイトの追加を拒否した理由（直前の追加が成功していれば空） */
  addSiteError: string;
  handleReblock: (site: TrackedSite) => Promise<void>;
  handleResetAnalytics: () => Promise<void>;
  handleStopTracking: (site: TrackedSite) => Promise<void>;
  handleRefreshAnalytics: () => Promise<void>;
  /** 追加できたら true（入力欄を空にしてよいか） */
  handleAddSiteToTrack: (domain: string) => Promise<boolean>;
}

const ADD_SITE_FAILED = 'Failed to add site';

/**
 * 分析タブの操作。追跡中のサイトと事実の表を書けるのは background だけなので、
 * どの操作もメッセージで依頼する。表示する値は画面が保存値を監視して追従する
 */
export function useAnalytics(): UseAnalyticsReturn {
  const [addSiteError, setAddSiteError] = useState('');

  // ブロックを効かせ直す。追跡だけのサイトはブロックリストに入れ、
  // 無効にしたサイトはトグルを ON に戻す（add-block は既存のブロック設定を重複として拒否するため）
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

  // 分析データのリセット（今日の分も含めて事実をすべて消す。追跡中のサイトの一覧は残す）
  const handleResetAnalytics = useCallback(async () => {
    try {
      await sendMessage('reset-activity');
    } catch {
      // Silently handle error
    }
  }, []);

  // 追跡を止める（サイトとその事実を消す）。stop-tracking はブロック設定を持つサイトを拒否するので、
  // 無効にしたブロック設定は先にブロックリストから外す。
  // 効いているブロックはここでは外さない（解除の確認を通らずにブロックが外れるため）
  const handleStopTracking = useCallback(async (site: TrackedSite) => {
    if (site.block?.enabled) return;
    try {
      if (site.block !== null) {
        const removed = await sendMessage('remove-block', {
          domain: site.domain
        });
        if (!removed.success) return;
      }
      await sendMessage('stop-tracking', { domain: site.domain });
    } catch {
      // Silently handle error
    }
  }, []);

  // 表示する値は保存値の監視で常に最新なので、読み直すものは無い
  const handleRefreshAnalytics = useCallback(async () => {}, []);

  // ブロックせずに追跡だけを始める（形式の誤り・重複・入れ子は background が拒否し、理由を error で返す）
  const handleAddSiteToTrack = useCallback(async (domain: string) => {
    try {
      const response = await sendMessage('add-tracked-site', { domain });
      if (!response.success) {
        setAddSiteError(response.error || ADD_SITE_FAILED);
        return false;
      }
      setAddSiteError('');
      return true;
    } catch {
      setAddSiteError(ADD_SITE_FAILED);
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
