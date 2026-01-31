import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react'

import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import { Settings } from 'lucide-react'

import { DownloadButton } from '~/components/features'
import { MiniStats, GoalDisplay } from '~/components/newtab'
import { setCurrentLanguage } from '~/lib/i18n'
import { isWithinSchedule } from '~/lib/time'
import { storage } from '~/lib/storage'
import { checkPremiumStatus } from '~/lib/license'
import {
  getBackgroundUrl,
  loadGoogleFont,
  FONT_WEIGHT_VALUE,
} from '~/constants'
import type {
  VisionSettings,
  DashboardDisplaySettings,
  AppSettings,
} from '~/types/storage'
import {
  DEFAULT_VISION,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_SETTINGS,
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
  const [stats, setStats] = useState({
    wasteTime: 0,
    investTime: 0,
    blockCount: 0,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Time tick for schedule checking (updates when tab becomes visible)
  const [timeTick, setTimeTick] = useState(0)

  // Check premium status
  useEffect(() => {
    const loadPremiumStatus = async () => {
      const status = await checkPremiumStatus()
      setIsPremium(status.isPremium)
    }
    loadPremiumStatus()
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
          return {
            goalText: schedulePreset.goalText,
            goalSubText: schedulePreset.goalSubText,
            textColor: schedulePreset.textColor,
            backgroundType: schedulePreset.backgroundType,
            backgroundImage: schedulePreset.backgroundImage,
            backgroundColor: schedulePreset.backgroundColor,
            // Custom background requires premium
            customBackgroundData: isPremium
              ? schedulePreset.customBackgroundData
              : null,
            fontSettings: schedulePreset.fontSettings,
          }
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
          return {
            goalText: activePreset.goalText,
            goalSubText: activePreset.goalSubText,
            textColor: activePreset.textColor,
            backgroundType: activePreset.backgroundType,
            backgroundImage: activePreset.backgroundImage,
            backgroundColor: activePreset.backgroundColor,
            // Custom background requires premium
            customBackgroundData: isPremium
              ? activePreset.customBackgroundData
              : null,
            fontSettings: activePreset.fontSettings,
          }
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

  // Fetch stats from background
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await sendToBackground({ name: 'get-stats' })
        setStats(response)
      } catch {
        // Silently handle error - stats will refresh on next interval
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
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
          wasteTime={stats.wasteTime}
          investTime={stats.investTime}
          blockCount={stats.blockCount}
        />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3">
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
