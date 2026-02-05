import React, { useCallback, useEffect, useState } from 'react';

import { sendToBackground } from '@plasmohq/messaging';
import { useStorage } from '@plasmohq/storage/hook';
import { Ban, Shield, TrendingUp, Clock } from 'lucide-react';

import {
  GoalCard,
  Header,
  QuickBlockButton,
  TimeLimitBadge
} from '~/components/features';
import { PasswordModal } from '~/components/options/modals';
import {
  useBackgroundStats,
  usePasswordVerification,
  usePremiumStatus
} from '~/hooks';
import { extractDomain } from '~/lib/domain';
import { getMessage, setCurrentLanguage } from '~/lib/i18n';
import { storage } from '~/lib/storage';
import type {
  AppSettings,
  VisionSettings,
  SupportedLanguage
} from '~/types/storage';
import { DEFAULT_SETTINGS, DEFAULT_VISION } from '~/types/storage';

import './styles/globals.css';

function PopupApp() {
  const [settings, setSettings] = useStorage<AppSettings>(
    {
      key: 'settings',
      instance: storage
    },
    DEFAULT_SETTINGS
  );
  const [vision] = useStorage<VisionSettings>(
    {
      key: 'vision',
      instance: storage
    },
    DEFAULT_VISION
  );
  const stats = useBackgroundStats(5000);
  const { isPremium } = usePremiumStatus();
  const [currentDomain, setCurrentDomain] = useState<string | undefined>();
  // Counter to force re-render when language changes (value unused intentionally)
  const [, setRenderKey] = useState(0);

  // Time limit info for current site
  const [timeLimitInfo, setTimeLimitInfo] = useState<{
    hasTimeLimit: boolean;
    remainingSeconds: number | null;
    limitType: 'daily' | 'hourly' | null;
    limitSeconds: number | null;
  } | null>(null);

  // Password verification for pause toggle
  const passwordVerification = usePasswordVerification({
    passwordHash: settings?.password?.passwordHash ?? null,
    onSuccess: async () => {
      await sendToBackground({
        name: 'toggle-pause',
        body: { paused: true }
      });
    }
  });

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language);
    }
  }, [settings?.language]);

  // Get current tab's domain and time limit info
  useEffect(() => {
    const getCurrentDomainAndTimeLimit = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        if (tab?.url) {
          const domain = extractDomain(tab.url);
          setCurrentDomain(domain || undefined);

          // Get time limit info for this URL
          if (tab.url) {
            const response = await sendToBackground({
              name: 'get-remaining-time',
              body: { url: tab.url }
            });
            if (response.success && response.data) {
              setTimeLimitInfo(response.data);
            }
          }
        }
      } catch {
        // Silently handle error - domain will be undefined
      }
    };

    getCurrentDomainAndTimeLimit();

    // Refresh time limit info every 10 seconds
    const interval = setInterval(getCurrentDomainAndTimeLimit, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSettingsClick = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  const handleHelpClick = useCallback(() => {
    // Open options page with help tab selected
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html#help') });
  }, []);

  const handleAnalyticsClick = useCallback(() => {
    // Open options page with analytics tab selected
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html#analytics')
    });
  }, []);

  const isPasswordProtected =
    settings?.password?.enabled && settings?.password?.passwordHash;

  const handlePausedChange = useCallback(
    async (paused: boolean) => {
      // Only require password when pausing (disabling blocking)
      if (paused && isPasswordProtected) {
        passwordVerification.openModal();
        return;
      }

      try {
        await sendToBackground({
          name: 'toggle-pause',
          body: { paused }
        });
      } catch {
        // Silently handle error
      }
    },
    [isPasswordProtected, passwordVerification]
  );

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

  const handleGoalClick = useCallback(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
  }, []);

  const handleBlock = useCallback(async (domain: string) => {
    try {
      const response = await sendToBackground({
        name: 'add-block',
        body: { domain }
      });
      if (response.success) {
        // Show success feedback
        setCurrentDomain(undefined);
      } else {
        alert(response.error || 'Failed to add block');
      }
    } catch {
      // Silently handle error
    }
  }, []);

  return (
    <div className="popup-container bg-white">
      <Header
        onSettingsClick={handleSettingsClick}
        onHelpClick={handleHelpClick}
        paused={settings?.paused ?? false}
        onPausedChange={handlePausedChange}
        language={settings?.language}
        onLanguageChange={handleLanguageChange}
      />

      <div className="p-4 space-y-4">
        {/* Time Limit Info for current site */}
        {timeLimitInfo?.hasTimeLimit &&
          timeLimitInfo.remainingSeconds !== null &&
          timeLimitInfo.limitType &&
          timeLimitInfo.limitSeconds && (
            <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700">
                  {currentDomain}
                </p>
                <TimeLimitBadge
                  remainingSeconds={timeLimitInfo.remainingSeconds}
                  limitSeconds={timeLimitInfo.limitSeconds}
                  limitType={timeLimitInfo.limitType}
                  compact
                />
              </div>
            </div>
          )}

        {/* Block Websites - Top priority action */}
        <QuickBlockButton currentDomain={currentDomain} onBlock={handleBlock} />

        {/* Goal Card */}
        <GoalCard
          goalText={
            vision?.defaultSettings?.goalText ||
            DEFAULT_VISION.defaultSettings.goalText
          }
          onClick={handleGoalClick}
        />

        {/* Today's Summary */}
        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            {getMessage('todaysSummary')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Today's Blocks */}
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-gray-500">
                  {getMessage('todayBlocks')}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {stats.blockCount}
              </p>
            </div>

            {/* Most Blocked Site */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-500">
                  {getMessage('topBlockedSite')}
                </span>
              </div>
              {stats.topBlockedSite ? (
                <div>
                  <p
                    className="text-sm font-bold text-blue-600 truncate"
                    title={stats.topBlockedSite.domain}
                  >
                    {stats.topBlockedSite.domain}
                  </p>
                  <p className="text-xs text-blue-500">
                    {getMessage(
                      'blockedTimesShort',
                      stats.topBlockedSite.count.toString()
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  {getMessage('noBlockedSitesYet')}
                </p>
              )}
            </div>
          </div>

          {/* Analytics Link (Premium only) */}
          {isPremium && (
            <button
              onClick={handleAnalyticsClick}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              {getMessage('viewAnalytics')}
            </button>
          )}
        </div>
      </div>

      {/* Password Modal for Pause */}
      {settings?.password?.passwordHash && (
        <PasswordModal
          isOpen={passwordVerification.showModal}
          onClose={passwordVerification.closeModal}
          onSuccess={async () => {
            await sendToBackground({
              name: 'toggle-pause',
              body: { paused: true }
            });
          }}
          passwordHash={settings.password.passwordHash}
          title={getMessage('passwordRequired')}
          description={getMessage('passwordRequiredForPause')}
        />
      )}
    </div>
  );
}

export default PopupApp;
