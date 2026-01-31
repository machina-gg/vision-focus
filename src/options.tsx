import React, { useCallback, useEffect, useState } from 'react'

import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import { Ban, Calendar, Crown, HelpCircle, Settings, TrendingUp } from 'lucide-react'

import { Tabs } from '~/components/ui'
import {
  GeneralTab,
  BlocklistTab,
  SchedulesTab,
  AnalyticsTab,
  PremiumTab,
  HelpTab,
  NewPresetModal,
  ScheduleModal,
} from '~/components/options'
import { useBlocklist, useSchedules, usePresets } from '~/hooks'
import { getMessage, setCurrentLanguage } from '~/lib/i18n'
import { storage } from '~/lib/storage'
import { checkPremiumStatus, getFeatureLimits } from '~/lib/license'
import { openPaymentPage, openManagementPage } from '~/lib/extpay'
import { parseDomainInput, isValidDomain } from '~/lib/domain'
import type {
  AppSettings,
  VisionSettings,
  AnalyticsData,
  UnblockHistory,
} from '~/types/storage'
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_UNBLOCK_HISTORY,
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
  // Read initial tab from URL hash (e.g., #help)
  const getInitialTab = () => {
    const hash = window.location.hash.slice(1) // Remove #
    const validTabs = ['general', 'blocklist', 'schedules', 'analytics', 'license', 'help']
    return validTabs.includes(hash) ? hash : 'general'
  }
  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    dailyStats: {},
    siteTime: {},
    siteCategories: {},
  })

  // Unblock history state
  const [unblockHistory, setUnblockHistory] = useState<UnblockHistory>(
    DEFAULT_UNBLOCK_HISTORY
  )

  // Premium state
  const [isPremium, setIsPremium] = useState(false)
  const [featureLimits, setFeatureLimits] = useState<FeatureLimits>(
    FEATURE_LIMITS.free
  )

  // Custom hooks
  const blocklist = useBlocklist({ settings, setSettings })
  const schedules = useSchedules({ settings, setSettings })
  const presets = usePresets({ vision, setVision })

  // Helper function to reload analytics data
  const reloadAnalyticsData = useCallback(async () => {
    const [analyticsResult, unblockResult] = await Promise.all([
      storage.get('analytics') as Promise<AnalyticsData | undefined>,
      storage.get('unblockHistory') as Promise<UnblockHistory | undefined>,
    ])
    if (analyticsResult) {
      setAnalyticsData(analyticsResult)
    }
    if (unblockResult) {
      setUnblockHistory(unblockResult)
    }
  }, [])

  // Load analytics and unblock history on mount
  useEffect(() => {
    reloadAnalyticsData()
  }, [reloadAnalyticsData])

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

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language)
    }
  }, [settings?.language])

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
    {
      id: 'help',
      label: getMessage('help'),
      icon: <HelpCircle className="w-4 h-4" />,
    },
  ]

  // Re-block handler
  const handleReblock = useCallback(
    async (domain: string) => {
      try {
        await sendToBackground({
          name: 'add-block',
          body: { domain },
        })
        // Refresh data after re-blocking
        await reloadAnalyticsData()
        const settingsResult = (await storage.get('settings')) as
          | AppSettings
          | undefined
        if (settingsResult) {
          setSettings(settingsResult)
        }
      } catch {
        // Silently handle error
      }
    },
    [setSettings, reloadAnalyticsData]
  )

  // Reset analytics handler (reset time only, keep site list)
  const handleResetAnalytics = useCallback(async () => {
    try {
      // Reset time for all sites but keep the list
      const currentHistory = (await storage.get('unblockHistory')) as
        | UnblockHistory
        | undefined
      if (currentHistory) {
        const resetHistory: UnblockHistory = {
          sites: Object.fromEntries(
            Object.entries(currentHistory.sites).map(([domain, site]) => [
              domain,
              { ...site, timeAfterUnblock: 0, lastActivity: null },
            ])
          ),
        }
        await storage.set('unblockHistory', resetHistory)
        setUnblockHistory(resetHistory)
      }

      // Clear analytics data
      const emptyAnalytics: AnalyticsData = {
        dailyStats: {},
        siteTime: {},
        siteCategories: {},
      }
      await storage.set('analytics', emptyAnalytics)
      setAnalyticsData(emptyAnalytics)
    } catch {
      // Silently handle error
    }
  }, [])

  // Stop tracking a site (remove from unblock history)
  const handleStopTracking = useCallback(async (domain: string) => {
    try {
      const currentHistory = (await storage.get('unblockHistory')) as
        | UnblockHistory
        | undefined
      if (currentHistory && currentHistory.sites[domain]) {
        const { [domain]: _, ...remainingSites } = currentHistory.sites
        const updatedHistory: UnblockHistory = { sites: remainingSites }
        await storage.set('unblockHistory', updatedHistory)
        setUnblockHistory(updatedHistory)

        // Also remove from analytics siteTime
        const currentAnalytics = (await storage.get('analytics')) as
          | AnalyticsData
          | undefined
        if (currentAnalytics && currentAnalytics.siteTime[domain]) {
          const { [domain]: __, ...remainingSiteTime } =
            currentAnalytics.siteTime
          const updatedAnalytics: AnalyticsData = {
            ...currentAnalytics,
            siteTime: remainingSiteTime,
          }
          await storage.set('analytics', updatedAnalytics)
          setAnalyticsData(updatedAnalytics)
        }
      }
    } catch {
      // Silently handle error
    }
  }, [])

  // Refresh analytics data
  const handleRefreshAnalytics = useCallback(async () => {
    try {
      await reloadAnalyticsData()
    } catch {
      // Silently handle error
    }
  }, [reloadAnalyticsData])

  // Add site to track manually
  const handleAddSiteToTrack = useCallback(async (domain: string) => {
    try {
      // Validate and parse domain
      const { domain: parsedDomain } = parseDomainInput(domain)
      if (!isValidDomain(parsedDomain)) {
        return // Invalid domain format
      }

      const currentHistory = (await storage.get('unblockHistory')) as
        | UnblockHistory
        | undefined
      const history = currentHistory || { sites: {} }

      // Don't add if already tracking
      if (history.sites[parsedDomain]) {
        return
      }

      history.sites[parsedDomain] = {
        domain: parsedDomain,
        unblockedAt: new Date().toISOString(),
        timeAfterUnblock: 0,
        lastActivity: null,
      }
      await storage.set('unblockHistory', history)
      setUnblockHistory(history)
    } catch {
      // Silently handle error
    }
  }, [])

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
            unblockHistory={unblockHistory}
            analyticsData={analyticsData}
            isPremium={isPremium}
            onReblock={handleReblock}
            onReset={handleResetAnalytics}
            onStopTracking={handleStopTracking}
            onRefresh={handleRefreshAnalytics}
            onAddSite={handleAddSiteToTrack}
          />
        )}

        {/* Premium Tab */}
        {activeTab === 'license' && (
          <PremiumTab
            isPremium={isPremium}
            onUpgrade={handleUpgrade}
            onManageSubscription={handleManageSubscription}
          />
        )}

        {/* Help Tab */}
        {activeTab === 'help' && <HelpTab />}
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
