import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react'

import { useStorage } from '@plasmohq/storage/hook'
import { Settings, ShieldX } from 'lucide-react'

import { DownloadButton } from '~/components/features'
import { MiniStats, GoalDisplay, BlockedSitesList } from '~/components/newtab'
import { useBackgroundStats, usePremiumStatus } from '~/hooks'
import { getMessage, setCurrentLanguage } from '~/lib/i18n'
import { presetToDisplaySettings } from '~/lib/presetUtils'
import {
  getLastBlockedDomain,
  clearLastBlockedDomain,
  getSiteBlockCount,
} from '~/lib/storage'
import { isWithinSchedule } from '~/lib/time'
import { storage } from '~/lib/storage'
import {
  getBackgroundUrl,
  loadGoogleFont,
  FONT_WEIGHT_VALUE,
} from '~/constants'
import type {
  VisionSettings,
  DashboardDisplaySettings,
  AppSettings,
  AnalyticsData,
} from '~/types/storage'
import {
  DEFAULT_VISION,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_ANALYTICS,
  FEATURE_LIMITS,
  getFontDefinition,
} from '~/types/storage'

import './styles/globals.css'

// Font size in pixels for newtab (larger than options preview)
const FONT_SIZE_PX: Record<string, number> = {
  sm: 30,
  md: 36,
  lg: 48,
  xl: 60,
}

function NewtabApp() {
  const [vision, setVision] = useStorage<VisionSettings>(
    {
      key: 'vision',
      instance: storage,
    },
    DEFAULT_VISION
  )
  const [settings] = useStorage<AppSettings>(
    {
      key: 'settings',
      instance: storage,
    },
    DEFAULT_SETTINGS
  )
  const [analytics] = useStorage<AnalyticsData>(
    {
      key: 'analytics',
      instance: storage,
    },
    DEFAULT_ANALYTICS
  )
  const stats = useBackgroundStats(10000)
  const { isPremium } = usePremiumStatus()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Blocked site info (shown when redirected from a blocked site)
  const [blockedInfo, setBlockedInfo] = useState<{
    domain: string
    count: number
  } | null>(null)

  // Time tick for schedule checking (updates when tab becomes visible)
  const [timeTick, setTimeTick] = useState(0)

  // Check if we were redirected from a blocked site
  useEffect(() => {
    const loadBlockedInfo = async () => {
      const domain = await getLastBlockedDomain()
      if (domain) {
        const count = await getSiteBlockCount(domain)
        setBlockedInfo({ domain, count })
        // Clear it so it doesn't show on next new tab
        await clearLastBlockedDomain()
      }
    }
    loadBlockedInfo()
  }, [])

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language)
    }
  }, [settings?.language])

  // Re-check schedule when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeTick((prev) => prev + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Helper to check if a preset is within free tier limits
  const isPresetAvailable = useCallback(
    (presetId: string, presets: VisionSettings['presets']) => {
      if (isPremium) return true
      const index = presets?.findIndex((p) => p.id === presetId) ?? -1
      return index >= 0 && index < FEATURE_LIMITS.free.maxPresets
    },
    [isPremium]
  )

  // Get current display settings
  // Priority: 1. Active schedule preset, 2. User-selected preset (activePresetId), 3. Default settings
  const displaySettings: DashboardDisplaySettings = useMemo(() => {
    if (!vision) return DEFAULT_DISPLAY_SETTINGS

    // Check for active schedule with a preset
    const activeScheduleWithPreset = settings?.schedules?.find(
      (schedule) =>
        schedule.enabled &&
        schedule.presetId &&
        isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
    )

    if (activeScheduleWithPreset?.presetId) {
      // Check if preset is available for free tier
      if (
        isPresetAvailable(activeScheduleWithPreset.presetId, vision.presets)
      ) {
        const schedulePreset = vision.presets?.find(
          (p) => p.id === activeScheduleWithPreset.presetId
        )
        if (schedulePreset) {
          return presetToDisplaySettings(schedulePreset, isPremium)
        }
      }
      // If preset is not available (beyond free limit), fall through to next priority
    }

    // Check for user-selected preset
    if (vision.activePresetId) {
      // Check if preset is available for free tier
      if (isPresetAvailable(vision.activePresetId, vision.presets)) {
        const activePreset = vision.presets?.find(
          (p) => p.id === vision.activePresetId
        )
        if (activePreset) {
          return presetToDisplaySettings(activePreset, isPremium)
        }
      }
      // If preset is not available (beyond free limit), fall through to default
    }

    // Fall back to default settings
    const defaultSettings = vision.defaultSettings || DEFAULT_DISPLAY_SETTINGS
    return {
      ...defaultSettings,
      // Custom background requires premium
      customBackgroundData: isPremium
        ? defaultSettings.customBackgroundData
        : null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeTick forces re-computation on tab visibility change
  }, [vision, settings, timeTick, isPremium, isPresetAvailable])

  // Get background style - supports custom uploaded background
  const isColorBackground = displaySettings.backgroundType === 'color'
  const backgroundUrl = displaySettings.customBackgroundData
    ? displaySettings.customBackgroundData
    : displaySettings.backgroundImage
      ? getBackgroundUrl(displaySettings.backgroundImage)
      : getBackgroundUrl('default-1')
  const backgroundColor = displaySettings.backgroundColor

  // Get font styles
  const fontSettings = displaySettings.fontSettings
  const fontDef = getFontDefinition(fontSettings.family)

  // Load Google Font
  useEffect(() => {
    if (fontDef.googleFont) {
      loadGoogleFont(fontDef.googleFont)
    }
  }, [fontDef.googleFont])

  const fontStyle = {
    fontFamily: fontDef.css,
    fontSize: `${FONT_SIZE_PX[fontSettings.size]}px`,
    fontWeight: FONT_WEIGHT_VALUE[fontSettings.weight],
  }

  // Get goal from display settings
  const goalText = displaySettings.goalText
  const goalSubText = displaySettings.goalSubText
  const textColor = displaySettings.textColor

  // Calculate blocking days for the blocked site
  const blockingDays = useMemo(() => {
    if (!blockedInfo?.domain || !settings?.blockList) return null

    // Find the block item for this domain
    const blockItem = settings.blockList.find(
      (item) =>
        item.domain === blockedInfo.domain ||
        (item.isWildcard &&
          blockedInfo.domain.endsWith(item.domain.replace('*.', '.')))
    )

    if (!blockItem?.createdAt) return null

    const createdDate = new Date(blockItem.createdAt)
    const now = new Date()
    const diffTime = now.getTime() - createdDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(1, diffDays) // At least 1 day
  }, [blockedInfo?.domain, settings?.blockList])

  const handleAnalyticsClick = useCallback(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html#analytics') })
  }, [])

  const handleStartEdit = useCallback(() => {
    setEditText(goalText)
    setIsEditing(true)
  }, [goalText])

  const handleSaveGoal = useCallback(async () => {
    if (vision && editText.trim()) {
      const updated = {
        ...vision,
        defaultSettings: {
          ...vision.defaultSettings,
          goalText: editText.trim(),
        },
      }
      await storage.set('vision', updated)
      setVision(updated)
    }
    setIsEditing(false)
  }, [vision, editText, setVision])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSaveGoal()
      }
      if (e.key === 'Escape') {
        setIsEditing(false)
      }
    },
    [handleSaveGoal]
  )

  const handleSettingsClick = useCallback(() => {
    chrome.runtime.openOptionsPage()
  }, [])

  // Check if user has any presets configured
  const hasPresets = (vision?.presets?.length ?? 0) > 0

  // Simple block page UI (when no presets are configured)
  if (!hasPresets) {
    return (
      <div
        ref={containerRef}
        className="newtab-container relative flex flex-col items-center justify-center"
        style={{ backgroundColor: '#1a1a2e' }}
      >
        {/* Content */}
        <div className="relative z-10 w-full max-w-md px-8 text-center">
          {/* Block Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <ShieldX className="w-12 h-12 text-red-400" />
            </div>
          </div>

          {/* Block Message */}
          {blockedInfo ? (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                {getMessage('siteBlocked')}
              </h1>
              <p className="text-gray-300 mb-4">{blockedInfo.domain}</p>
              <p className="text-red-300 text-sm">
                {getMessage('blockedTimes', blockedInfo.count.toString())}
              </p>
            </div>
          ) : (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                VisionFocus
              </h1>
              <p className="text-gray-400">{getMessage('rememberGoal')}</p>
            </div>
          )}

          {/* Mini Stats */}
          <MiniStats
            blockCount={stats.blockCount}
            blockingDays={blockingDays}
            isPremium={isPremium}
            onAnalyticsClick={handleAnalyticsClick}
          />

          {/* Blocked Sites List */}
          <BlockedSitesList
            blockList={settings?.blockList || []}
            blockCounts={analytics?.siteBlockCounts || {}}
          />

          {/* Setup CTA */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-400 text-sm mb-3">
              {getMessage('noPresetsDescription')}
            </p>
            <button
              onClick={handleSettingsClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              {getMessage('createFirstPreset')}
            </button>
          </div>
        </div>

        {/* Settings Button - excluded from wallpaper capture */}
        <div
          className="absolute bottom-6 right-6"
          data-html2canvas-ignore="true"
        >
          <button
            onClick={handleSettingsClick}
            className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // Full dashboard UI (when presets are configured)
  return (
    <div
      ref={containerRef}
      className="newtab-container relative flex flex-col items-center justify-center"
      style={
        isColorBackground
          ? { backgroundColor }
          : {
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
      }
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl px-8 text-center">
        {/* Blocked Site Info */}
        {blockedInfo && (
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 bg-red-500/20 backdrop-blur-sm rounded-xl px-6 py-4 border border-red-500/30">
              <ShieldX className="w-6 h-6 text-red-400" />
              <div className="text-left">
                <p className="text-white font-medium">
                  {getMessage('siteBlockedMessage', blockedInfo.domain)}
                </p>
                <p className="text-red-200 text-sm">
                  {getMessage('blockedTimes', blockedInfo.count.toString())}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Goal Text */}
        <div className="mb-12">
          <GoalDisplay
            goalText={goalText}
            goalSubText={goalSubText}
            textColor={textColor}
            fontStyle={fontStyle}
            isEditing={isEditing}
            editText={editText}
            canEdit={!vision?.activePresetId}
            onEditTextChange={setEditText}
            onStartEdit={handleStartEdit}
            onSave={handleSaveGoal}
            onCancel={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Mini Stats */}
        <MiniStats
          blockCount={stats.blockCount}
          blockingDays={blockingDays}
          isPremium={isPremium}
          onAnalyticsClick={handleAnalyticsClick}
        />

        {/* Blocked Sites List */}
        <BlockedSitesList
          blockList={settings?.blockList || []}
          blockCounts={analytics?.siteBlockCounts || {}}
        />
      </div>

      {/* Bottom Controls - excluded from wallpaper capture */}
      <div
        className="absolute bottom-6 right-6 flex items-center gap-3"
        data-html2canvas-ignore="true"
      >
        {/* Download Wallpaper Button (Premium) */}
        {isPremium && containerRef.current && (
          <DownloadButton
            targetRef={containerRef as React.RefObject<HTMLElement>}
          />
        )}

        {/* Settings Button */}
        <button
          onClick={handleSettingsClick}
          className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default NewtabApp
