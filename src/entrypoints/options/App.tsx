import React, { useEffect, useState } from 'react';

// ロゴはバンドルに含めるため ?inline（データ URL）で import する。
// getExtensionURL 経由だと web_accessible_resources 未宣言のファイルはビルド出力に含まれず 404 になる
import logoBase64 from '~/assets/images/logo.png?inline';

import { Ban, Calendar, HelpCircle, Palette, TrendingUp } from 'lucide-react';

import { Tabs } from '~/components/ui';
import {
  StylesTab,
  BlocklistTab,
  SchedulesTab,
  AnalyticsTab,
  HelpTab,
  ScheduleModal
} from '~/components/options';
import { AnalyticsOptInModal } from '~/components/options/modals';
import {
  useAnalytics,
  useBlocklist,
  useSchedules,
  useSupportPrompt,
  useYouTubeSettings
} from '~/hooks';
import { getMessage } from '~/lib/i18n';
import { getSettings, getVision, settingsItem } from '~/lib/storage';
import { TABS, getTabFromHash, isValidTab, type TabName } from '~/constants';
import { SettingsProvider, useSettings } from '~/contexts/SettingsContext';
import type { AnalyticsOptIn, PasswordSettings } from '~/types/storage';
import { DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';

import '~/styles/globals.css';

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

  // Custom hooks
  const analytics = useAnalytics({ setSettings });
  const blocklist = useBlocklist({ settings, setSettings });
  const schedules = useSchedules({ settings, setSettings });
  const { handleYouTubeChange } = useYouTubeSettings({ settings, setSettings });
  const supportPrompt = useSupportPrompt();

  // Password settings handler
  const handlePasswordUpdate = async (password: PasswordSettings) => {
    if (!settings) return;
    const updated = { ...settings, password };
    await settingsItem.setValue(updated);
    setSettings(updated);
  };

  // Analytics opt-in handler
  const handleAnalyticsOptIn = async (optIn: AnalyticsOptIn) => {
    if (!settings) return;
    const updated = { ...settings, analyticsOptIn: optIn };
    await settingsItem.setValue(updated);
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
      id: TABS.HELP,
      label: getMessage('help'),
      icon: <HelpCircle className="w-4 h-4" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="bg-white border-b border-gray-200"
        data-testid="options-header"
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            {/* ロゴは横長（およそ 4.4:1）なので高さだけ固定し、幅は縦横比に任せる。
                正方形枠に収めると幅方向に大きく縮んで判読できなくなる */}
            <img
              src={logoBase64}
              alt="VisionFocus Logo"
              className="h-10 w-auto object-contain"
            />
            <h1
              className="text-2xl font-bold text-gray-900"
              data-testid="options-title"
            >
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
        {activeTab === TABS.STYLES && <StylesTab />}

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
            onReblock={analytics.handleReblock}
            onReset={analytics.handleResetAnalytics}
            onStopTracking={analytics.handleStopTracking}
            onRefresh={analytics.handleRefreshAnalytics}
            onAddSite={analytics.handleAddSiteToTrack}
            isSupportPromptVisible={supportPrompt.isVisible}
            onSupport={supportPrompt.handleSupport}
            onDismissSupport={supportPrompt.handleDismiss}
          />
        )}

        {/* Help Tab */}
        {activeTab === TABS.HELP && (
          <HelpTab
            onAnalyticsOptInChange={handleAnalyticsOptIn}
            onSettingsChange={async () => {
              // Reload settings and vision after import
              const [newSettings, newVision] = await Promise.all([
                getSettings(),
                getVision()
              ]);
              setSettings(newSettings);
              setVision(newVision);
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
        error={schedules.scheduleError}
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

export function OptionsApp() {
  return (
    <SettingsProvider>
      <OptionsAppContent />
    </SettingsProvider>
  );
}
