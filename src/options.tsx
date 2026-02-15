import React, { useEffect, useState } from 'react';

import {
  Ban,
  Calendar,
  Crown,
  HelpCircle,
  Palette,
  TrendingUp
} from 'lucide-react';

import { Tabs } from '~/components/ui';
import {
  StylesTab,
  BlocklistTab,
  SchedulesTab,
  AnalyticsTab,
  PremiumTab,
  HelpTab,
  ScheduleModal
} from '~/components/options';
import { AnalyticsOptInModal } from '~/components/options/modals';
import {
  useAnalytics,
  useBlocklist,
  useLicense,
  useSchedules,
  usePremiumStatus
} from '~/hooks';
import { getMessage } from '~/lib/i18n';
import { storage } from '~/lib/storage';
import { TABS, getTabFromHash, isValidTab, type TabName } from '~/constants';
import { SettingsProvider, useSettings } from '~/contexts/SettingsContext';
import type {
  AnalyticsOptIn,
  YouTubeSettings,
  PasswordSettings,
  UnblockHistory
} from '~/types/storage';
import {
  DEFAULT_YOUTUBE_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';
import { incrementYouTubeBlockCount } from '~/lib/youtubeBlockService';

import './styles/globals.css';

function OptionsAppContent() {
  const { settings, setSettings, vision, setVision } = useSettings();

  // Read initial tab from URL hash (e.g., #help)
  const [activeTab, setActiveTab] = useState<TabName>(() =>
    getTabFromHash(window.location.hash)
  );

  // Sync URL hash with active tab
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  // Premium status (from hook)
  const { isPremium, featureLimits } = usePremiumStatus();

  // Custom hooks
  const analytics = useAnalytics({ setSettings });
  const blocklist = useBlocklist({ settings, setSettings });
  const license = useLicense();
  const schedules = useSchedules({ settings, setSettings });

  // YouTube settings handler with block count and unblockHistory tracking
  const handleYouTubeChange = async (youtube: YouTubeSettings) => {
    if (!settings) return;
    const prevEnabled = settings.youtube?.enabled ?? false;
    const newEnabled = youtube.enabled;

    const updated = { ...settings, youtube };
    await storage.set('settings', updated);
    setSettings(updated);

    // Track YouTube enable/disable transitions
    if (!prevEnabled && newEnabled) {
      // YouTube blocking enabled - create TrackedSite entry
      await incrementYouTubeBlockCount();
      const history =
        ((await storage.get('unblockHistory')) as UnblockHistory) ??
        DEFAULT_UNBLOCK_HISTORY;
      history.sites['youtube.com'] = {
        domain: 'youtube.com',
        status: 'blocked',
        blockedAt: new Date().toISOString(),
        unblockedAt: null,
        timeAfterUnblock: 0,
        lastActivity: null
      };
      await storage.set('unblockHistory', history);
    } else if (prevEnabled && !newEnabled) {
      // YouTube blocking disabled - mark as unblocked in history
      const history =
        ((await storage.get('unblockHistory')) as UnblockHistory) ??
        DEFAULT_UNBLOCK_HISTORY;
      const existing = history.sites['youtube.com'];
      if (existing) {
        existing.status = 'unblocked';
        existing.unblockedAt = new Date().toISOString();
      } else {
        history.sites['youtube.com'] = {
          domain: 'youtube.com',
          status: 'unblocked',
          blockedAt: new Date().toISOString(),
          unblockedAt: new Date().toISOString(),
          timeAfterUnblock: 0,
          lastActivity: null
        };
      }
      await storage.set('unblockHistory', history);
    }
  };

  // Password settings handler
  const handlePasswordUpdate = async (password: PasswordSettings) => {
    if (!settings) return;
    const updated = { ...settings, password };
    await storage.set('settings', updated);
    setSettings(updated);
  };

  // Analytics opt-in handler
  const handleAnalyticsOptIn = async (optIn: AnalyticsOptIn) => {
    if (!settings) return;
    const updated = { ...settings, analyticsOptIn: optIn };
    await storage.set('settings', updated);
    setSettings(updated);
  };

  // Language change handler
  const handleLanguageChange = async (language: 'en' | 'ja' | null) => {
    if (!settings) return;
    const updated = { ...settings, language };
    await storage.set('settings', updated);
    setSettings(updated);
  };

  // Tabs configuration (using TABS constant for type safety)
  const tabs: Array<{ id: TabName; label: string; icon: React.ReactNode }> = [
    {
      id: TABS.BLOCKLIST,
      label: getMessage('blockList'),
      icon: <Ban className="w-4 h-4" />
    },
    {
      id: TABS.STYLES,
      label: getMessage('styles'),
      icon: <Palette className="w-4 h-4" />
    },
    {
      id: TABS.SCHEDULES,
      label: getMessage('schedules'),
      icon: <Calendar className="w-4 h-4" />
    },
    {
      id: TABS.ANALYTICS,
      label: getMessage('analytics'),
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: TABS.LICENSE,
      label: getMessage('premium'),
      icon: <Crown className="w-4 h-4" />
    },
    {
      id: TABS.HELP,
      label: getMessage('help'),
      icon: <HelpCircle className="w-4 h-4" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/images/logo.png"
              alt="VisionFocus Logo"
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              {getMessage('settingsTitle')}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => {
            if (isValidTab(tabId)) {
              setActiveTab(tabId);
            }
          }}
          className="mb-8"
        />

        {/* Styles Tab */}
        {activeTab === TABS.STYLES && (
          <StylesTab isPremium={isPremium} featureLimits={featureLimits} />
        )}

        {/* Block List Tab */}
        {activeTab === TABS.BLOCKLIST && (
          <BlocklistTab
            newDomain={blocklist.newDomain}
            setNewDomain={blocklist.setNewDomain}
            blockError={blocklist.blockError}
            onAddDomain={blocklist.handleAddDomain}
            onRemoveDomain={blocklist.handleRemoveDomain}
            onToggleDomain={blocklist.handleToggleDomain}
            onUpdateTimeLimit={blocklist.handleUpdateTimeLimit}
            onUpdateNotifications={blocklist.handleUpdateNotifications}
            siteBlockCounts={analytics.analyticsData.siteBlockCounts}
            timeLimitUsage={analytics.analyticsData.timeLimitUsage}
            youtube={settings?.youtube ?? DEFAULT_YOUTUBE_SETTINGS}
            onYouTubeChange={handleYouTubeChange}
          />
        )}

        {/* Schedules Tab */}
        {activeTab === TABS.SCHEDULES && (
          <SchedulesTab
            onAddSchedule={schedules.openAddSchedule}
            onEditSchedule={schedules.openEditSchedule}
            onDeleteSchedule={schedules.handleDeleteSchedule}
            onToggleSchedule={schedules.handleToggleSchedule}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === TABS.ANALYTICS && (
          <AnalyticsTab
            unblockHistory={analytics.unblockHistory}
            analyticsData={analytics.analyticsData}
            isPremium={isPremium}
            onReblock={analytics.handleReblock}
            onReset={analytics.handleResetAnalytics}
            onStopTracking={analytics.handleStopTracking}
            onRefresh={analytics.handleRefreshAnalytics}
            onAddSite={analytics.handleAddSiteToTrack}
          />
        )}

        {/* Premium Tab */}
        {activeTab === TABS.LICENSE && (
          <PremiumTab
            isPremium={isPremium}
            onUpgrade={license.handleUpgrade}
            onManageSubscription={license.handleManageSubscription}
          />
        )}

        {/* Help Tab */}
        {activeTab === TABS.HELP && (
          <HelpTab
            onAnalyticsOptInChange={handleAnalyticsOptIn}
            onSettingsChange={async () => {
              // Reload settings and vision after import
              const [newSettings, newVision] = await Promise.all([
                storage.get('settings') as Promise<typeof settings>,
                storage.get('vision') as Promise<typeof vision>
              ]);
              if (newSettings) setSettings(newSettings);
              if (newVision) setVision(newVision);
              await analytics.reloadAnalyticsData();
            }}
            onPasswordUpdate={handlePasswordUpdate}
            onLanguageChange={handleLanguageChange}
          />
        )}
      </main>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={schedules.showScheduleModal}
        onClose={() => schedules.setShowScheduleModal(false)}
        editingSchedule={schedules.editingSchedule}
        scheduleForm={schedules.scheduleForm}
        onFormChange={schedules.setScheduleForm}
        onSave={schedules.handleSaveSchedule}
        vision={vision}
        isPremium={isPremium}
        featureLimits={featureLimits}
      />
      {/* Analytics Opt-In Modal (shown once on first visit if not yet decided) */}
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
    </div>
  );
}

function OptionsApp() {
  return (
    <SettingsProvider>
      <OptionsAppContent />
    </SettingsProvider>
  );
}

export default OptionsApp;
