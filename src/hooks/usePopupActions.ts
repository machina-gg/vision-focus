import { useCallback } from 'react';

import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';

import { openExtensionPage, openOptionsPage } from '~/lib/chromeApi';
import type { AppSettings } from '~/types/storage';

interface UsePopupActionsOptions {
  settings: AppSettings | undefined;
  clearDomain: () => void;
}

interface UsePopupActionsReturn {
  handleSettingsClick: () => void;
  handleHelpClick: () => void;
  handleAnalyticsClick: () => void;
  handleGoalClick: () => void;
  handleBlock: (domain: string) => Promise<void>;
  handlePausedChange: (paused: boolean) => Promise<void>;
  isPasswordProtected: boolean;
}

/** ポップアップのページ遷移・ブロック追加・一時停止切り替えの操作と、パスワード保護の有無を提供する */
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
