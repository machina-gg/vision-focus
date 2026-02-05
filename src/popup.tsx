import React, { useCallback } from 'react';

import { useStorage } from '@plasmohq/storage/hook';
import { Ban, Shield, TrendingUp, Clock } from 'lucide-react';

import {
  GoalCard,
  Header,
  QuickBlockButton,
  TimeLimitBadge
} from '~/components/features';
import { PasswordModal } from '~/components/options/modals';
import { POPUP_STATS_POLLING_MS } from '~/constants/intervals';
import {
  useBackgroundStats,
  useCurrentDomain,
  usePasswordVerification,
  usePopupActions,
  usePremiumStatus
} from '~/hooks';
import { getMessage } from '~/lib/i18n';
import { storage } from '~/lib/storage';
import type { AppSettings, VisionSettings } from '~/types/storage';
import { DEFAULT_SETTINGS, DEFAULT_VISION } from '~/types/storage';

import './styles/globals.css';

function PopupApp() {
  const [settings, setSettings] = useStorage<AppSettings>(
    { key: 'settings', instance: storage },
    DEFAULT_SETTINGS
  );
  const [vision] = useStorage<VisionSettings>(
    { key: 'vision', instance: storage },
    DEFAULT_VISION
  );
  const stats = useBackgroundStats(POPUP_STATS_POLLING_MS);
  const { isPremium } = usePremiumStatus();
  const { currentDomain, timeLimitInfo, clearDomain } = useCurrentDomain();

  const {
    handleSettingsClick,
    handleHelpClick,
    handleAnalyticsClick,
    handleGoalClick,
    handleLanguageChange,
    handleBlock,
    handlePausedChange,
    isPasswordProtected
  } = usePopupActions({ settings, setSettings, clearDomain });

  // Password verification for pause toggle
  const passwordVerification = usePasswordVerification({
    passwordHash: settings?.password?.passwordHash ?? null,
    onSuccess: async () => {
      await handlePausedChange(true);
    }
  });

  const handlePausedChangeWithPassword = useCallback(
    async (paused: boolean) => {
      if (paused && isPasswordProtected) {
        passwordVerification.openModal();
        return;
      }
      await handlePausedChange(paused);
    },
    [isPasswordProtected, passwordVerification, handlePausedChange]
  );

  return (
    <div className="popup-container bg-white">
      <Header
        onSettingsClick={handleSettingsClick}
        onHelpClick={handleHelpClick}
        paused={settings?.paused ?? false}
        onPausedChange={handlePausedChangeWithPassword}
        language={settings?.language}
        onLanguageChange={handleLanguageChange}
      />

      <div className="p-4 space-y-4">
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

        <QuickBlockButton currentDomain={currentDomain} onBlock={handleBlock} />

        <GoalCard
          goalText={
            vision?.defaultSettings?.goalText ||
            DEFAULT_VISION.defaultSettings.goalText
          }
          onClick={handleGoalClick}
        />

        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            {getMessage('todaysSummary')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
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
            await handlePausedChange(true);
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
