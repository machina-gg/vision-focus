import { useCallback } from 'react';

import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';

import { openExtensionPage, openOptionsPage } from '~/lib/chromeApi';

interface UsePopupActionsOptions {
  /** 表示中のドメインを消す（ブロックに加えたあとに呼ぶ） */
  clearDomain: () => void;
}

interface UsePopupActionsReturn {
  /** 設定画面を開く */
  handleSettingsClick: () => void;
  /** 設定画面のヘルプを開く */
  handleHelpClick: () => void;
  /** 設定画面の分析タブを開く */
  handleAnalyticsClick: () => void;
  /** ダッシュボード（新しいタブ）を開く */
  handleGoalClick: () => void;
  /** domain をブロックリストに加える。失敗したら文言を alert で出す */
  handleBlock: (domain: string) => Promise<void>;
}

/**
 * ポップアップのページ遷移とブロック追加の操作を提供する
 * @param options フックの入力（下記の項目）
 * @param options.clearDomain ブロックに加えたあと表示中のドメインを消す関数
 * @returns 各操作
 */
export function usePopupActions({
  clearDomain
}: UsePopupActionsOptions): UsePopupActionsReturn {
  const handleSettingsClick = useCallback(() => {
    openOptionsPage();
  }, []);

  const handleHelpClick = useCallback(() => {
    openExtensionPage('options.html#help');
  }, []);

  const handleAnalyticsClick = useCallback(() => {
    openExtensionPage('options.html#analytics');
  }, []);

  const handleGoalClick = useCallback(() => {
    openExtensionPage('newtab.html');
  }, []);

  const handleBlock = useCallback(
    async (domain: string) => {
      try {
        const response = await sendMessage('add-block', { domain });
        if (response.success) {
          clearDomain();
        } else {
          alert(messageErrorText(response.error));
        }
      } catch {
        // Silently handle error
      }
    },
    [clearDomain]
  );

  return {
    handleSettingsClick,
    handleHelpClick,
    handleAnalyticsClick,
    handleGoalClick,
    handleBlock
  };
}
