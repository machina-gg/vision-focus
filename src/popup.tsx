import React, { useCallback } from 'react';

import { Ban, Shield, TrendingUp, Clock, Timer, Unlock } from 'lucide-react';

import {
  GoalCard,
  Header,
  QuickBlockButton,
  TimeLimitBadge
} from '~/components/features';
import {
  AnalyticsOptInModal,
  PasswordModal
} from '~/components/options/modals';
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
import { formatTimeLocalized } from '~/lib/time';
import { SettingsProvider, useSettings } from '~/contexts/SettingsContext';
import type { AnalyticsOptIn } from '~/types/storage';
import { DEFAULT_VISION } from '~/types/storage';

import './styles/globals.css';

function PopupAppContent() {
  const { settings, setSettings, vision } = useSettings();
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

  // Analytics opt-in handler
  const handleAnalyticsOptIn = async (optIn: AnalyticsOptIn) => {
    if (!settings) return;
    const updated = { ...settings, analyticsOptIn: optIn };
    await storage.set('settings', updated);
    setSettings(updated);
  };

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
            <div className="bg-info-50 rounded-xl p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-info-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-info-700">
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
            <div className="bg-block-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="w-4 h-4 text-block-500" />
                <span className="text-xs font-medium text-gray-500">
                  {getMessage('todayBlocks')}
                </span>
              </div>
              <p className="text-2xl font-bold text-block-600">
                {stats.blockCount}
              </p>
            </div>

            <div className="bg-info-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-info-500" />
                <span className="text-xs font-medium text-gray-500">
                  {getMessage('topBlockedSite')}
                </span>
              </div>
              {stats.topBlockedSite ? (
                <div>
                  <p
                    className="text-sm font-bold text-info-600 truncate"
                    title={stats.topBlockedSite.domain}
                  >
                    {stats.topBlockedSite.domain}
                  </p>
                  <p className="text-xs text-info-500">
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

            <div className="bg-warning-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-warning-500" />
                <span className="text-xs font-medium text-gray-500">
                  {getMessage('todayWastedTime')}
                </span>
              </div>
              <p className="text-2xl font-bold text-warning-600">
                {formatTimeLocalized(stats.wasteTime)}
              </p>
            </div>

            <div className="bg-success-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Unlock className="w-4 h-4 text-success-500" />
                <span className="text-xs font-medium text-gray-500">
                  {getMessage('todayUnblocks')}
                </span>
              </div>
              <p className="text-2xl font-bold text-success-600">
                {stats.unblockCount}
              </p>
            </div>
          </div>

          {isPremium && (
            <button
              onClick={handleAnalyticsClick}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-info-600 hover:text-info-700 hover:bg-info-50 rounded-lg transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              {getMessage('viewAnalytics')}
            </button>
          )}
        </div>
      </div>

      {/* Analytics Opt-In Modal */}
      <AnalyticsOptInModal
        onAllow={() =>
          handleAnalyticsOptIn({
            enabled: true,
            decidedAt: new Date().toISOString()
          })
        }
        onDeny={() =>
          handleAnalyticsOptIn({
            enabled: false,
            decidedAt: new Date().toISOString()
          })
        }
      />

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

function PopupApp() {
  return (
    <SettingsProvider>
      <PopupAppContent />
    </SettingsProvider>
  );
}

export default PopupApp;
