import { useCallback, useEffect, useState } from 'react';

import { sendToBackground } from '@plasmohq/messaging';

import { openExtensionPage, openOptionsPage } from '~/lib/chromeApi';
import { setCurrentLanguage } from '~/lib/i18n';
import type { AppSettings, SupportedLanguage } from '~/types/storage';

interface UsePopupActionsOptions {
  settings: AppSettings | undefined;
  setSettings: (settings: AppSettings) => void;
  clearDomain: () => void;
}

interface UsePopupActionsReturn {
  handleSettingsClick: () => void;
  handleHelpClick: () => void;
  handleAnalyticsClick: () => void;
  handleGoalClick: () => void;
  handleLanguageChange: (language: SupportedLanguage) => Promise<void>;
  handleBlock: (domain: string) => Promise<void>;
  handlePausedChange: (paused: boolean) => Promise<void>;
  isPasswordProtected: boolean;
  renderKey: number;
}

/**
 * Hook to encapsulate popup navigation, language, block, and pause actions.
 * Password modal state is NOT managed here (kept in popup.tsx until #94 merges).
 * Instead, `handlePausedChange` calls the provided `onPasswordRequired` callback
 * when a password check is needed, which popup.tsx handles by showing the modal.
 */
export function usePopupActions({
  settings,
  setSettings,
  clearDomain
}: UsePopupActionsOptions): UsePopupActionsReturn {
  // Counter to force re-render when language changes (value unused intentionally)
  const [renderKey, setRenderKey] = useState(0);

  const isPasswordProtected = Boolean(
    settings?.password?.enabled && settings?.password?.passwordHash
  );

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language);
    }
  }, [settings?.language]);

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

  const handleLanguageChange = useCallback(
    async (language: SupportedLanguage) => {
      // Update i18n module immediately
      setCurrentLanguage(language);
      // Force re-render to update all translated text
      setRenderKey((prev) => prev + 1);
      // Save to storage
      if (settings) {
        await setSettings({ ...settings, language });
      }
    },
    [settings, setSettings]
  );

  const handleBlock = useCallback(
    async (domain: string) => {
      try {
        const response = await sendToBackground({
          name: 'add-block',
          body: { domain }
        });
        if (response.success) {
          clearDomain();
        } else {
          alert(response.error || 'Failed to add block');
        }
      } catch {
        // Silently handle error
      }
    },
    [clearDomain]
  );

  const handlePausedChange = useCallback(async (paused: boolean) => {
    try {
      await sendToBackground({
        name: 'toggle-pause',
        body: { paused }
      });
    } catch {
      // Silently handle error
    }
  }, []);

  return {
    handleSettingsClick,
    handleHelpClick,
    handleAnalyticsClick,
    handleGoalClick,
    handleLanguageChange,
    handleBlock,
    handlePausedChange,
    isPasswordProtected,
    renderKey
  };
}
