import React, { useEffect, useState } from 'react';

import { useStorage } from '@plasmohq/storage/hook';
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
import {
  useAnalytics,
  useBlocklist,
  useLicense,
  useSchedules,
  usePremiumStatus
} from '~/hooks';
import { getMessage, setCurrentLanguage } from '~/lib/i18n';
import { storage } from '~/lib/storage';
import { TABS, getTabFromHash, isValidTab, type TabName } from '~/constants';
import type {
  AppSettings,
  VisionSettings,
  YouTubeSettings,
  PasswordSettings,
  UnblockHistory
} from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_YOUTUBE_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';
import { incrementYouTubeBlockCount } from '~/lib/youtubeBlockService';

import './styles/globals.css';

function OptionsApp() {
  const [settings, setSettings] = useStorage<AppSettings>(
    {
      key: 'settings',
      instance: storage
    },
    DEFAULT_SETTINGS
  );
  const [vision, setVision] = useStorage<VisionSettings>(
    {
      key: 'vision',
      instance: storage
    },
    DEFAULT_VISION
  );

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

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language);
    }
  }, [settings?.language]);

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
          <h1 className="text-2xl font-bold text-gray-900">
            {getMessage('settingsTitle')}
          </h1>
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
            settings={settings}
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
            settings={settings}
            vision={vision}
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
            settings={settings}
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
            settings={settings}
            onSettingsChange={async () => {
              // Reload settings and vision after import
              const [newSettings, newVision] = await Promise.all([
                storage.get('settings') as Promise<AppSettings | undefined>,
                storage.get('vision') as Promise<VisionSettings | undefined>
              ]);
              if (newSettings) setSettings(newSettings);
              if (newVision) setVision(newVision);
              await analytics.reloadAnalyticsData();
            }}
            onPasswordUpdate={handlePasswordUpdate}
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
    </div>
  );
}

export default OptionsApp;
