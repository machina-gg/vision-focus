import React, { useCallback, useEffect, useState, useRef } from 'react'

import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import { Ban, Clock, Edit2, Settings, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'

import { StatsCard, DownloadButton } from '~/components/features'
import { Button, Input } from '~/components/ui'
import { getMessage } from '~/lib/i18n'
import { formatTime } from '~/lib/time'
import { storage } from '~/lib/storage'
import { checkPremiumStatus } from '~/lib/license'
import type { VisionSettings, Goal } from '~/types/storage'
import { DEFAULT_VISION, DEFAULT_FONT_SETTINGS, FONT_FAMILY_MAP, FONT_SIZE_MAP, FONT_WEIGHT_MAP, getFontDefinition } from '~/types/storage'

import './styles/globals.css'

// Load Google Font dynamically
function loadGoogleFont(fontName: string) {
  const linkId = `google-font-${fontName.replace(/\+/g, '-')}`
  if (document.getElementById(linkId)) return

  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
}

// Font size in pixels for inline styles
const FONT_SIZE_PX: Record<string, number> = {
  sm: 30,
  md: 36,
  lg: 48,
  xl: 60,
}

// Font weight values
const FONT_WEIGHT_VALUE: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

// Background images
const BACKGROUNDS: Record<string, string> = {
  'default-1': chrome.runtime.getURL('assets/images/backgrounds/default-1.png'),
  'default-2': chrome.runtime.getURL('assets/images/backgrounds/default-2.png'),
  'default-3': chrome.runtime.getURL('assets/images/backgrounds/default-3.png'),
}

function NewtabApp() {
  const [vision, setVision] = useStorage<VisionSettings>({
    key: 'vision',
    instance: storage,
  }, DEFAULT_VISION)
  const [stats, setStats] = useState({
    wasteTime: 0,
    investTime: 0,
    blockCount: 0,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check premium status
  useEffect(() => {
    const loadPremiumStatus = async () => {
      const status = await checkPremiumStatus()
      setIsPremium(status.isPremium)
    }
    loadPremiumStatus()
  }, [])

  // Get background style - supports custom uploaded background
  const isColorBackground = vision?.backgroundType === 'color'
  const backgroundUrl = vision?.customBackgroundData
    ? vision.customBackgroundData
    : vision?.backgroundImage
      ? BACKGROUNDS[vision.backgroundImage] || vision.backgroundImage
      : BACKGROUNDS['default-1']
  const backgroundColor = vision?.backgroundColor || '#1a1a2e'

  // Get font styles
  const fontSettings = vision?.fontSettings || DEFAULT_FONT_SETTINGS
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

  // Get goals (use multiple if available, otherwise use single goal)
  const goals: Goal[] = vision?.goals && vision.goals.length > 0
    ? vision.goals
    : [{
        id: 'default',
        text: vision?.goalText || DEFAULT_VISION.goalText,
        subText: vision?.goalSubText || '',
        color: vision?.textColor || '#ffffff',
        createdAt: new Date().toISOString(),
        order: 0,
      }]

  // Auto-rotate goals (every 5 seconds)
  useEffect(() => {
    if (goals.length <= 1) return

    const interval = setInterval(() => {
      setCurrentGoalIndex((prev) => (prev + 1) % goals.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [goals.length])

  // Fetch stats from background
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await sendToBackground({
          name: 'get-stats',
        })
        setStats(response)
      } catch (error) {
        console.error('Failed to get stats:', error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleStartEdit = useCallback(() => {
    setEditText(vision?.goalText || '')
    setIsEditing(true)
  }, [vision?.goalText])

  const handleSaveGoal = useCallback(async () => {
    if (vision && editText.trim()) {
      const updated = { ...vision, goalText: editText.trim() }
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

  const handlePrevGoal = useCallback(() => {
    setCurrentGoalIndex((prev) => (prev - 1 + goals.length) % goals.length)
  }, [goals.length])

  const handleNextGoal = useCallback(() => {
    setCurrentGoalIndex((prev) => (prev + 1) % goals.length)
  }, [goals.length])

  // Current goal
  const currentGoal = goals[currentGoalIndex]

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
        {/* Goal Text with Carousel */}
        <div className="mb-12">
          {isEditing ? (
            <div className="space-y-4">
              <Input
                value={editText}
                onChange={setEditText}
                onKeyDown={handleKeyDown}
                placeholder={getMessage('enterGoalPlaceholder')}
                className="text-center text-2xl bg-white/90"
                autoFocus
              />
              <div className="flex justify-center gap-2">
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  {getMessage('cancel')}
                </Button>
                <Button onClick={handleSaveGoal}>{getMessage('save')}</Button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              {/* Navigation arrows for multiple goals */}
              {goals.length > 1 && (
                <>
                  <button
                    onClick={handlePrevGoal}
                    className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextGoal}
                    className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              <h1
                className="drop-shadow-lg leading-tight transition-opacity duration-300"
                style={{ color: currentGoal.color, ...fontStyle }}
              >
                {currentGoal.text}
              </h1>
              {currentGoal.subText && (
                <p
                  className="text-lg md:text-xl mt-4 drop-shadow-lg opacity-80 whitespace-pre-line"
                  style={{ color: currentGoal.color, ...fontStyle }}
                >
                  {currentGoal.subText}
                </p>
              )}

              {/* Goal navigation dots */}
              {goals.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {goals.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentGoalIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentGoalIndex
                          ? 'bg-white scale-125'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Edit button - only show for single goal mode */}
              {goals.length === 1 && goals[0].id === 'default' && (
                <button
                  onClick={handleStartEdit}
                  className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mini Stats */}
        <div className="flex justify-center gap-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
            <div className="flex items-center justify-center gap-2 text-red-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">{getMessage('waste')}</span>
            </div>
            <p className="text-xl font-bold text-red-600">
              {formatTime(stats.wasteTime)}
            </p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
            <div className="flex items-center justify-center gap-2 text-green-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">{getMessage('invest')}</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              {formatTime(stats.investTime)}
            </p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
            <div className="flex items-center justify-center gap-2 text-amber-500 mb-1">
              <Ban className="w-4 h-4" />
              <span className="text-xs font-medium">{getMessage('blocked')}</span>
            </div>
            <p className="text-xl font-bold text-amber-600">
              {stats.blockCount}
            </p>
          </div>
        </div>
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
