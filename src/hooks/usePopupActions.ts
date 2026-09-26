import { useCallback } from 'react';

import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';

import { openExtensionPage, openOptionsPage } from '~/lib/chromeApi';
import type { AppSettings } from '~/types/storage';

interface UsePopupActionsOptions {
  /** 今のアプリ設定。読み込み前は undefined */
  settings: AppSettings | undefined;
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
  /** すべてのブロックの一時停止を切り替える */
  handlePausedChange: (paused: boolean) => Promise<void>;
  /** パスワード保護が有効で、パスワードも設定済みか */
  isPasswordProtected: boolean;
}

/**
 * ポップアップのページ遷移・ブロック追加・一時停止切り替えの操作と、パスワード保護の有無を提供する
 * @param options フックの入力（下記の項目）
 * @param options.settings 今のアプリ設定。読み込み前は undefined
 * @param options.clearDomain ブロックに加えたあと表示中のドメインを消す関数
 * @returns 各操作とパスワード保護の有無
 */
export function usePopupActions({
  settings,
  clearDomain
}: UsePopupActionsOptions): UsePopupActionsReturn {
  const isPasswordProtected = Boolean(
    settings?.password?.enabled && settings?.password?.passwordHash
  );

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

  const handlePausedChange = useCallback(async (paused: boolean) => {
    try {
      await sendMessage('toggle-pause', { paused });
    } catch {
      // Silently handle error
    }
  }, []);

  return {
    handleSettingsClick,
    handleHelpClick,
    handleAnalyticsClick,
    handleGoalClick,
    handleBlock,
    handlePausedChange,
    isPasswordProtected
  };
}
