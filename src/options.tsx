import React, { useCallback, useEffect, useState } from 'react'

import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import { Ban, Calendar, Crown, Settings, TrendingUp } from 'lucide-react'

import { Tabs } from '~/components/ui'
import {
  GeneralTab,
  BlocklistTab,
  SchedulesTab,
  AnalyticsTab,
  PremiumTab,
  NewPresetModal,
  ScheduleModal,
} from '~/components/options'
import { useBlocklist, useSchedules, usePresets } from '~/hooks'
import { getMessage } from '~/lib/i18n'
import { storage } from '~/lib/storage'
import { checkPremiumStatus, getFeatureLimits } from '~/lib/license'
import { openPaymentPage, openManagementPage } from '~/lib/extpay'
import type {
  AppSettings,
  VisionSettings,
  AnalyticsData,
} from '~/types/storage'
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  FEATURE_LIMITS,
  type FeatureLimits,
} from '~/types/storage'

import './styles/globals.css'

function OptionsApp() {
  const [settings, setSettings] = useStorage<AppSettings>(
    {
      key: 'settings',
      instance: storage,
    },
    DEFAULT_SETTINGS
  )
  const [vision, setVision] = useStorage<VisionSettings>(
    {
      key: 'vision',
      instance: storage,
    },
    DEFAULT_VISION
  )
  const [activeTab, setActiveTab] = useState('general')

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    dailyStats: {},
    siteTime: {},
    siteCategories: {},
  })

  // Premium state
  const [isPremium, setIsPremium] = useState(false)
  const [featureLimits, setFeatureLimits] = useState<FeatureLimits>(
    FEATURE_LIMITS.free
  )

  // Custom hooks
  const blocklist = useBlocklist({ settings, setSettings })
  const schedules = useSchedules({ settings, setSettings })
  const presets = usePresets({ vision, setVision })

  // Load analytics
  useEffect(() => {
    const loadAnalytics = async () => {
      const data = (await storage.get('analytics')) as AnalyticsData | undefined
      if (data) {
        setAnalyticsData(data)
      }
    }
    loadAnalytics()
  }, [])

  // Load premium status
  useEffect(() => {
    const loadPremiumStatus = async () => {
      const status = await checkPremiumStatus()
      setIsPremium(status.isPremium)
      const limits = await getFeatureLimits()
      setFeatureLimits(limits)
    }
    loadPremiumStatus()
  }, [])

  // Tabs configuration
  const tabs = [
    {
      id: 'general',
      label: getMessage('general'),
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'blocklist',
      label: getMessage('blockList'),
      icon: <Ban className="w-4 h-4" />,
    },
    {
      id: 'schedules',
      label: getMessage('schedules'),
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: getMessage('analytics'),
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'license',
      label: getMessage('premium'),
      icon: <Crown className="w-4 h-4" />,
    },
  ]

  // Analytics handlers
  const handleSiteCategoryChange = useCallback(
    async (domain: string, category: 'waste' | 'invest' | 'neutral') => {
      try {
        await sendToBackground({
          name: 'set-site-category',
          body: { domain, category },
        })
        const data = (await storage.get('analytics')) as
          | AnalyticsData
          | undefined
        if (data) {
          setAnalyticsData(data)
        }
      } catch {
        // Silently handle error - analytics will refresh on next load
      }
    },
    []
  )

  // Premium handlers
  const handleUpgrade = useCallback(() => {
    openPaymentPage()
  }, [])

  const handleManageSubscription = useCallback(() => {
    openManagementPage()
  }, [])

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
          onChange={setActiveTab}
          className="mb-8"
        />

        {/* General Tab */}
        {activeTab === 'general' && (
          <GeneralTab
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
        {activeTab === 'blocklist' && (
          <BlocklistTab
            settings={settings}
            newDomain={blocklist.newDomain}
            setNewDomain={blocklist.setNewDomain}
            blockError={blocklist.blockError}
            onAddDomain={blocklist.handleAddDomain}
            onRemoveDomain={blocklist.handleRemoveDomain}
            isPremium={isPremium}
            featureLimits={featureLimits}
          />
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
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
        {activeTab === 'analytics' && (
          <AnalyticsTab
            analyticsData={analyticsData}
            isPremium={isPremium}
            onSiteCategoryChange={handleSiteCategoryChange}
          />
        )}

        {/* Premium Tab */}
        {activeTab === 'license' && (
          <PremiumTab
            settings={settings}
            isPremium={isPremium}
            onUpgrade={handleUpgrade}
            onManageSubscription={handleManageSubscription}
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
  )
}

export default OptionsApp
