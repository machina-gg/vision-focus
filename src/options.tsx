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
  NewPresetModal,
  ScheduleModal
} from '~/components/options';
import {
  useAnalytics,
  useBlocklist,
  useLicense,
  useSchedules,
  usePresets,
  usePremiumStatus
} from '~/hooks';
import { getMessage, setCurrentLanguage } from '~/lib/i18n';
import { storage } from '~/lib/storage';
import { TABS, getTabFromHash, isValidTab, type TabName } from '~/constants';
import type { AppSettings, VisionSettings } from '~/types/storage';
import { DEFAULT_SETTINGS, DEFAULT_VISION } from '~/types/storage';

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
  const presets = usePresets({ vision, setVision });

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language);
    }
  }, [settings?.language]);

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
          <StylesTab
            vision={vision}
            draftPresets={presets.draftPresets}
            selectedPresetId={presets.selectedPresetId}
            draftDisplaySettings={presets.draftDisplaySettings}
            editingPresetName={presets.editingPresetName}
            isDirty={presets.isDirty}
            visionSaved={presets.visionSaved}
            isPremium={isPremium}
            featureLimits={featureLimits}
            onSelectPreset={presets.handleSelectPreset}
            onCreatePresetClick={() => presets.setShowSavePresetModal(true)}
            onDeletePreset={presets.handleDeletePreset}
            onApplyPreset={presets.handleApplyPreset}
            onSavePreset={presets.handleSaveSelectedPreset}
            onPresetNameChange={presets.handlePresetNameChange}
            onGoalTextChange={presets.handleGoalTextChange}
            onGoalSubTextChange={presets.handleGoalSubTextChange}
            onTextColorChange={presets.handleTextColorChange}
            onBackgroundTypeChange={presets.handleBackgroundTypeChange}
            onBackgroundChange={presets.handleBackgroundChange}
            onBackgroundColorChange={presets.handleBackgroundColorChange}
            onCustomBackgroundChange={presets.handleCustomBackgroundChange}
            onFontSettingsChange={presets.handleFontSettingsChange}
          />
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
            siteBlockCounts={analytics.analyticsData.siteBlockCounts}
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
          />
        )}
      </main>

      {/* New Preset Modal */}
      <NewPresetModal
        isOpen={presets.showSavePresetModal}
        onClose={() => presets.setShowSavePresetModal(false)}
        presetName={presets.presetName}
        onPresetNameChange={presets.setPresetName}
        onCreate={presets.handleCreatePreset}
      />

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
