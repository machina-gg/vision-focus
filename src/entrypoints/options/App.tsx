import React, { useEffect, useState } from 'react';

// ?inline で埋め込む（URL 参照だと web_accessible_resources 未宣言のためビルド出力に含まれず 404 になる）
import logoBase64 from '~/assets/images/logo.png?inline';

import {
  Ban,
  Calendar,
  HelpCircle,
  Palette,
  Settings,
  TrendingUp
} from 'lucide-react';

import { Tabs } from '~/components/ui';
import {
  StylesTab,
  BlocklistTab,
  SchedulesTab,
  AnalyticsTab,
  SettingsTab,
  HelpTab,
  ScheduleModal
} from '~/components/options';
import { AnalyticsOptInModal } from '~/components/options/modals';
import {
  useActivitySources,
  useAnalytics,
  useBlocklist,
  useSchedules,
  useStorageItem,
  useSupportPrompt,
  useYouTubeSettings
} from '~/hooks';
import { getMessage } from '~/lib/i18n';
import { sendMessage } from '~/lib/messaging';
import { sitesItem } from '~/lib/storage';
import { TABS, getTabFromHash, isValidTab, type TabName } from '~/constants';
import { SettingsProvider, useSettings } from '~/contexts/SettingsContext';
import type { UnblockConfirmSettings } from '~/types/storage';

import '~/styles/globals.css';

function OptionsAppContent() {
  const { settings, vision } = useSettings();

  const [activeTab, setActiveTab] = useState<TabName>(() =>
    getTabFromHash(window.location.hash)
  );

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  const analytics = useAnalytics();
  const blocklist = useBlocklist();
  const schedules = useSchedules({ settings });
  const { handleYouTubeChange } = useYouTubeSettings();
  const supportPrompt = useSupportPrompt();
  const { activity } = useActivitySources();
  const [trackedSites] = useStorageItem(sitesItem);

  const handleUnblockConfirmUpdate = async (
    unblockConfirm: UnblockConfirmSettings
  ) => {
    await sendMessage('update-unblock-confirm', { unblockConfirm }).catch(
      () => undefined
    );
  };

  const handleAnalyticsOptIn = async (enabled: boolean) => {
    await sendMessage('update-analytics-opt-in', { enabled }).catch(
      () => undefined
    );
  };

  const tabs: Array<{ id: TabName; label: string; icon: React.ReactNode }> = [
    {
      id: TABS.BLOCKLIST,
      label: getMessage('blocklistTab'),
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
      id: TABS.SETTINGS,
      label: getMessage('settings'),
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: TABS.HELP,
      label: getMessage('help'),
      icon: <HelpCircle className="w-4 h-4" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="bg-white border-b border-gray-200"
        data-testid="options-header"
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
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

        {activeTab === TABS.STYLES && <StylesTab />}

        {activeTab === TABS.BLOCKLIST && (
          <BlocklistTab
            newDomain={blocklist.newDomain}
            setNewDomain={blocklist.setNewDomain}
            blockError={blocklist.blockError}
            onAddDomain={blocklist.handleAddDomain}
            onRemoveDomain={blocklist.handleRemoveDomain}
            onToggleDomain={blocklist.handleToggleDomain}
            onUpdateTimeLimit={blocklist.handleUpdateTimeLimit}
            activity={activity}
            trackedSites={trackedSites}
            onYouTubeChange={handleYouTubeChange}
          />
        )}

        {activeTab === TABS.SCHEDULES && (
          <SchedulesTab
            onAddSchedule={schedules.openAddSchedule}
            onEditSchedule={schedules.openEditSchedule}
            onDeleteSchedule={schedules.handleDeleteSchedule}
            onToggleSchedule={schedules.handleToggleSchedule}
          />
        )}

        {activeTab === TABS.ANALYTICS && (
          <AnalyticsTab
            activity={activity}
            trackedSites={trackedSites}
            onReblock={analytics.handleReblock}
            onReset={analytics.handleResetAnalytics}
            onStopTracking={analytics.handleStopTracking}
            onRefresh={analytics.handleRefreshAnalytics}
            onAddSite={analytics.handleAddSiteToTrack}
            addSiteError={analytics.addSiteError}
            isSupportPromptVisible={supportPrompt.isVisible}
            onSupport={supportPrompt.handleSupport}
            onDismissSupport={supportPrompt.handleDismiss}
          />
        )}

        {activeTab === TABS.SETTINGS && (
          <SettingsTab
            onUnblockConfirmUpdate={handleUnblockConfirmUpdate}
            onUpdateNotifications={blocklist.handleUpdateNotifications}
            onAnalyticsOptInChange={handleAnalyticsOptIn}
          />
        )}

        {activeTab === TABS.HELP && <HelpTab />}
      </main>

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
      <AnalyticsOptInModal
        onAllow={() => handleAnalyticsOptIn(true)}
        onDeny={() => handleAnalyticsOptIn(false)}
      />
    </div>
  );
}

/**
 * 設定画面（ブロック・表示・スケジュール・分析・設定・ヘルプのタブを持つ）
 * @returns SettingsProvider で包んだ設定画面
 */
export function OptionsApp() {
  return (
    <SettingsProvider>
      <OptionsAppContent />
    </SettingsProvider>
  );
}
