import React, { useCallback, useEffect, useState, useRef } from 'react'

import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import {
  Ban,
  Calendar,
  Check,
  Clock,
  Crown,
  ExternalLink,
  Image,
  Key,
  Plus,
  Settings,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'

import { Button, Card, Input, Modal, Tabs, Toggle } from '~/components/ui'
import {
  UpgradePrompt,
  ImageUploader,
  FontPicker,
  GoalList,
  AnalyticsChart,
  ReportCard,
  SiteCategoryManager,
} from '~/components/features'
import { formatTime, getTodayKey } from '~/lib/time'
import { getMessage, formatDate } from '~/lib/i18n'
import { parseDomainInput } from '~/lib/domain'
import { storage } from '~/lib/storage'
import { checkPremiumStatus, getFeatureLimits, canAddToBlocklist } from '~/lib/license'
import { activateGumroadLicense, getGumroadPurchaseUrl } from '~/lib/gumroad'
import {
  enableDevMode,
  disableDevMode,
  isDevModeActive,
  formatRemainingTime,
  isDevModeAllowed,
} from '~/lib/devMode'
import { deactivateLicense } from '~/lib/license'
import type {
  AppSettings,
  Schedule,
  VisionSettings,
  DailyStat,
  AnalyticsData,
  LicenseInfo,
  Goal,
  FontSettings,
} from '~/types/storage'
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_LICENSE,
  DEFAULT_FONT_SETTINGS,
  FREE_TIER_LIMITS,
  FEATURE_LIMITS,
  type FeatureLimits,
} from '~/types/storage'
import { canAccessFeature } from '~/lib/license'

import './styles/globals.css'

// Background images for selection
const BACKGROUND_OPTIONS = [
  { id: 'default-1', name: 'Mountain' },
  { id: 'default-2', name: 'Ocean' },
  { id: 'default-3', name: 'Forest' },
]

function OptionsApp() {
  const [settings, setSettings] = useStorage<AppSettings>({
    key: 'settings',
    instance: storage,
  }, DEFAULT_SETTINGS)
  const [vision, setVision] = useStorage<VisionSettings>({
    key: 'vision',
    instance: storage,
  }, DEFAULT_VISION)
  const [activeTab, setActiveTab] = useState('general')

  // Block list state
  const [newDomain, setNewDomain] = useState('')
  const [blockError, setBlockError] = useState('')

  // Schedule state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    days: [1, 2, 3, 4, 5] as number[],
  })

  // Draft vision state (for preview, saved on button click)
  const [draftVision, setDraftVision] = useState<VisionSettings>(DEFAULT_VISION)
  const [visionSaved, setVisionSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    dailyStats: {},
    siteTime: {},
    siteCategories: {},
  })
  const analytics = analyticsData.dailyStats

  // License state
  const [license] = useStorage<LicenseInfo>({
    key: 'license',
    instance: storage,
  }, DEFAULT_LICENSE)
  const [isPremium, setIsPremium] = useState(false)
  const [premiumSource, setPremiumSource] = useState<string | null>(null)
  const [premiumExpires, setPremiumExpires] = useState<string | null>(null)
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [licenseError, setLicenseError] = useState('')
  const [licenseSuccess, setLicenseSuccess] = useState('')
  const [activatingLicense, setActivatingLicense] = useState(false)
  const [featureLimits, setFeatureLimits] = useState<FeatureLimits>(FEATURE_LIMITS.free)

  // Dev mode state
  const [devModeActive, setDevModeActive] = useState(false)
  const [devModeRemaining, setDevModeRemaining] = useState<string | null>(null)
  const [devModeKeyCount, setDevModeKeyCount] = useState(0)
  const [showDevModeInput, setShowDevModeInput] = useState(false)
  const [devModeSecret, setDevModeSecret] = useState('')
  const devModeKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync draft with stored vision
  useEffect(() => {
    if (vision) {
      setDraftVision(vision)
      setIsDirty(false)
    }
  }, [vision])

  useEffect(() => {
    const loadAnalytics = async () => {
      const data = (await storage.get('analytics')) as AnalyticsData | undefined
      if (data) {
        setAnalyticsData(data)
      }
    }
    loadAnalytics()
  }, [])

  // Load premium status and dev mode
  useEffect(() => {
    const loadPremiumStatus = async () => {
      const status = await checkPremiumStatus()
      setIsPremium(status.isPremium)
      setPremiumSource(status.source)
      setPremiumExpires(status.expiresAt)
      const limits = await getFeatureLimits()
      setFeatureLimits(limits)
    }
    loadPremiumStatus()

    const loadDevModeStatus = async () => {
      const status = await isDevModeActive()
      setDevModeActive(status.active)
      if (status.remainingMs) {
        setDevModeRemaining(formatRemainingTime(status.remainingMs))
      }
    }
    loadDevModeStatus()

    // Update dev mode remaining time every minute
    const interval = setInterval(loadDevModeStatus, 60000)
    return () => clearInterval(interval)
  }, [license])

  // Handle dev mode secret key combo (Ctrl+Shift+D x5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()

        // Clear previous timeout
        if (devModeKeyTimeoutRef.current) {
          clearTimeout(devModeKeyTimeoutRef.current)
        }

        const newCount = devModeKeyCount + 1
        setDevModeKeyCount(newCount)

        if (newCount >= 5) {
          setShowDevModeInput(true)
          setDevModeKeyCount(0)
        } else {
          // Reset count after 2 seconds of inactivity
          devModeKeyTimeoutRef.current = setTimeout(() => {
            setDevModeKeyCount(0)
          }, 2000)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [devModeKeyCount])

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
      label: getMessage('license'),
      icon: <Crown className="w-4 h-4" />,
    },
  ]

  // Handler functions
  const handleToggleSetting = useCallback(
    async (key: keyof AppSettings, value: boolean) => {
      if (!settings) return
      const updated = { ...settings, [key]: value }
      await storage.set('settings', updated)
      setSettings(updated)
    },
    [settings, setSettings]
  )

  const handleAddDomain = useCallback(async () => {
    if (!settings || !newDomain.trim()) return

    // Check tier limit using dynamic limits
    const limitCheck = await canAddToBlocklist(settings.blockList.length)
    if (!limitCheck.allowed) {
      setBlockError(limitCheck.reason || `Limit reached: ${limitCheck.limit} sites`)
      return
    }

    const parsed = parseDomainInput(newDomain)
    if (!parsed) {
      setBlockError('Invalid domain format')
      return
    }

    // Check for duplicates
    if (settings.blockList.some((item) => item.domain === parsed.domain)) {
      setBlockError('Domain already in block list')
      return
    }

    try {
      const response = await sendToBackground({
        name: 'add-block',
        body: { domain: newDomain.trim() },
      })

      if (response.success) {
        setNewDomain('')
        setBlockError('')
        // Refresh settings to show the new item
        const updatedSettings = await storage.get<AppSettings>('settings')
        if (updatedSettings) {
          setSettings(updatedSettings)
        }
      } else {
        setBlockError(response.error || 'Failed to add domain')
      }
    } catch (error) {
      setBlockError('Failed to add domain')
    }
  }, [settings, newDomain, setSettings])

  const handleRemoveDomain = useCallback(async (id: string) => {
    try {
      await sendToBackground({
        name: 'remove-block',
        body: { id },
      })
      // Refresh settings to reflect the removal
      const updatedSettings = await storage.get<AppSettings>('settings')
      if (updatedSettings) {
        setSettings(updatedSettings)
      }
    } catch (error) {
      console.error('Failed to remove domain:', error)
    }
  }, [setSettings])

  const handleSaveSchedule = useCallback(async () => {
    if (!settings || !scheduleForm.name.trim()) return

    const newSchedule: Schedule = {
      id: editingSchedule?.id || crypto.randomUUID(),
      name: scheduleForm.name,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      days: scheduleForm.days,
      enabled: true,
    }

    const updatedSchedules = editingSchedule
      ? settings.schedules.map((s) =>
          s.id === editingSchedule.id ? newSchedule : s
        )
      : [...settings.schedules, newSchedule]

    const updated = { ...settings, schedules: updatedSchedules }
    await storage.set('settings', updated)
    setSettings(updated)
    setShowScheduleModal(false)
    setEditingSchedule(null)
    setScheduleForm({
      name: '',
      startTime: '09:00',
      endTime: '17:00',
      days: [1, 2, 3, 4, 5],
    })
  }, [settings, setSettings, scheduleForm, editingSchedule])

  const handleDeleteSchedule = useCallback(
    async (id: string) => {
      if (!settings) return
      const updated = {
        ...settings,
        schedules: settings.schedules.filter((s) => s.id !== id),
      }
      await storage.set('settings', updated)
      setSettings(updated)
    },
    [settings, setSettings]
  )

  const handleToggleSchedule = useCallback(
    async (id: string, enabled: boolean) => {
      if (!settings) return
      const updated = {
        ...settings,
        schedules: settings.schedules.map((s) =>
          s.id === id ? { ...s, enabled } : s
        ),
      }
      await storage.set('settings', updated)
      setSettings(updated)
    },
    [settings, setSettings]
  )

  // Draft update handlers (preview only, not saved to storage)
  const handleDraftGoalTextChange = useCallback((text: string) => {
    setDraftVision((prev) => ({ ...prev, goalText: text }))
    setIsDirty(true)
  }, [])

  const handleDraftGoalSubTextChange = useCallback((text: string) => {
    setDraftVision((prev) => ({ ...prev, goalSubText: text }))
    setIsDirty(true)
  }, [])

  const handleDraftTextColorChange = useCallback((color: string) => {
    setDraftVision((prev) => ({ ...prev, textColor: color }))
    setIsDirty(true)
  }, [])

  const handleDraftBackgroundChange = useCallback((bgId: string) => {
    setDraftVision((prev) => ({ ...prev, backgroundImage: bgId }))
    setIsDirty(true)
  }, [])

  const handleDraftBackgroundTypeChange = useCallback((type: 'image' | 'color') => {
    setDraftVision((prev) => ({ ...prev, backgroundType: type }))
    setIsDirty(true)
  }, [])

  const handleDraftColorChange = useCallback((color: string) => {
    setDraftVision((prev) => ({ ...prev, backgroundColor: color }))
    setIsDirty(true)
  }, [])

  // Premium feature handlers
  const handleCustomBackgroundChange = useCallback((dataUrl: string | null) => {
    setDraftVision((prev) => ({ ...prev, customBackgroundData: dataUrl }))
    setIsDirty(true)
  }, [])

  const handleFontSettingsChange = useCallback((fontSettings: FontSettings) => {
    setDraftVision((prev) => ({ ...prev, fontSettings }))
    setIsDirty(true)
  }, [])

  const handleAddGoal = useCallback(
    (goalData: Omit<Goal, 'id' | 'createdAt' | 'order'>) => {
      const newGoal: Goal = {
        ...goalData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        order: draftVision.goals?.length || 0,
      }
      setDraftVision((prev) => ({
        ...prev,
        goals: [...(prev.goals || []), newGoal],
      }))
      setIsDirty(true)
    },
    [draftVision.goals]
  )

  const handleUpdateGoal = useCallback(
    (id: string, goalData: Omit<Goal, 'id' | 'createdAt' | 'order'>) => {
      setDraftVision((prev) => ({
        ...prev,
        goals: (prev.goals || []).map((g) =>
          g.id === id ? { ...g, ...goalData } : g
        ),
      }))
      setIsDirty(true)
    },
    []
  )

  const handleDeleteGoal = useCallback((id: string) => {
    setDraftVision((prev) => ({
      ...prev,
      goals: (prev.goals || []).filter((g) => g.id !== id),
    }))
    setIsDirty(true)
  }, [])

  const handleReorderGoals = useCallback((goals: Goal[]) => {
    setDraftVision((prev) => ({ ...prev, goals }))
    setIsDirty(true)
  }, [])

  // Save all vision settings to storage
  const handleSaveVision = useCallback(async () => {
    if (!draftVision.goalText.trim() || !isDirty) return
    const toSave = {
      ...draftVision,
      goalText: draftVision.goalText.trim(),
      goalSubText: draftVision.goalSubText.trim(),
    }
    await storage.set('vision', toSave)
    setVision(toSave)
    setIsDirty(false)
    setVisionSaved(true)
    setTimeout(() => setVisionSaved(false), 2000)
  }, [draftVision, isDirty, setVision])

  const openEditSchedule = useCallback((schedule: Schedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      days: schedule.days,
    })
    setShowScheduleModal(true)
  }, [])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const toggleDay = useCallback((day: number) => {
    setScheduleForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort(),
    }))
  }, [])

  // License handlers
  const handleActivateLicense = useCallback(async () => {
    if (!licenseKeyInput.trim()) return

    setActivatingLicense(true)
    setLicenseError('')
    setLicenseSuccess('')

    const result = await activateGumroadLicense(licenseKeyInput.trim())

    if (result.success) {
      setLicenseSuccess(getMessage('licenseActivated'))
      setLicenseKeyInput('')
      // Refresh premium status
      const status = await checkPremiumStatus()
      setIsPremium(status.isPremium)
      setPremiumSource(status.source)
      setPremiumExpires(status.expiresAt)
      const limits = await getFeatureLimits()
      setFeatureLimits(limits)
    } else {
      setLicenseError(result.error || getMessage('invalidLicenseKey'))
    }

    setActivatingLicense(false)
  }, [licenseKeyInput])

  const handleDeactivateLicense = useCallback(async () => {
    await deactivateLicense()
    setIsPremium(false)
    setPremiumSource(null)
    setPremiumExpires(null)
    setFeatureLimits(FEATURE_LIMITS.free)
    setLicenseSuccess(getMessage('licenseDeactivated'))
  }, [])

  const handleEnableDevMode = useCallback(async () => {
    if (!devModeSecret.trim()) return

    const result = await enableDevMode(devModeSecret.trim())

    if (result.success) {
      setDevModeActive(true)
      if (result.expiresAt) {
        const remaining = new Date(result.expiresAt).getTime() - Date.now()
        setDevModeRemaining(formatRemainingTime(remaining))
      }
      setShowDevModeInput(false)
      setDevModeSecret('')
      // Refresh premium status
      const status = await checkPremiumStatus()
      setIsPremium(status.isPremium)
      setPremiumSource(status.source)
    } else {
      setLicenseError(result.error || 'Invalid secret')
    }
  }, [devModeSecret])

  const handleDisableDevMode = useCallback(async () => {
    await disableDevMode()
    setDevModeActive(false)
    setDevModeRemaining(null)
    // Refresh premium status
    const status = await checkPremiumStatus()
    setIsPremium(status.isPremium)
    setPremiumSource(status.source)
    setPremiumExpires(status.expiresAt)
  }, [])

  // Handle site category change
  const handleSiteCategoryChange = useCallback(
    async (domain: string, category: 'waste' | 'invest' | 'neutral') => {
      try {
        await sendToBackground({
          name: 'set-site-category',
          body: { domain, category },
        })
        // Refresh analytics data
        const data = (await storage.get('analytics')) as AnalyticsData | undefined
        if (data) {
          setAnalyticsData(data)
        }
      } catch (error) {
        console.error('Failed to set site category:', error)
      }
    },
    []
  )

  // Get recent analytics
  const recentAnalytics = Object.entries(analytics)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {getMessage('settingsTitle')}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-8"
        />

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-600" />
                  {getMessage('goalSettings')}
                </div>
              </h2>
              <div className="space-y-4">
                {/* Main Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {getMessage('yourGoal')}
                  </label>
                  <Input
                    value={draftVision.goalText}
                    onChange={handleDraftGoalTextChange}
                    placeholder={getMessage('goalPlaceholder')}
                  />
                </div>

                {/* Sub-message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {getMessage('goalSubText')}
                  </label>
                  <textarea
                    value={draftVision.goalSubText}
                    onChange={(e) => handleDraftGoalSubTextChange(e.target.value)}
                    placeholder={getMessage('goalSubTextPlaceholder')}
                    maxLength={100}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {draftVision.goalSubText.length} / 100
                  </p>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getMessage('textColor')}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={draftVision.textColor}
                      onChange={(e) => handleDraftTextColorChange(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={draftVision.textColor}
                      onChange={(e) => handleDraftTextColorChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono w-28"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  {getMessage('goalDescription')}
                </p>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('dashboardBackground')}
              </h2>

              {/* Background Type Toggle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getMessage('backgroundType')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDraftBackgroundTypeChange('image')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (draftVision.backgroundType || 'image') === 'image'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getMessage('backgroundTypeImage')}
                  </button>
                  <button
                    onClick={() => handleDraftBackgroundTypeChange('color')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      draftVision.backgroundType === 'color'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getMessage('backgroundTypeColor')}
                  </button>
                </div>
              </div>

              {/* Image Selection */}
              {(draftVision.backgroundType || 'image') === 'image' && (
                <div className="grid grid-cols-3 gap-4">
                  {BACKGROUND_OPTIONS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => handleDraftBackgroundChange(bg.id)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-colors ${
                        draftVision.backgroundImage === bg.id
                          ? 'border-blue-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={chrome.runtime.getURL(
                          `assets/images/backgrounds/${bg.id}.png`
                        )}
                        alt={bg.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
                        {bg.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Color Selection */}
              {draftVision.backgroundType === 'color' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getMessage('selectColor')}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={draftVision.backgroundColor}
                      onChange={(e) => handleDraftColorChange(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={draftVision.backgroundColor}
                      onChange={(e) => handleDraftColorChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono w-28"
                      placeholder="#1a1a2e"
                    />
                  </div>
                </div>
              )}

              {/* Custom Background Upload (Premium) */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    {getMessage('customBackground')}
                  </h3>
                  {!isPremium && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      {getMessage('premium')}
                    </span>
                  )}
                </div>
                {isPremium ? (
                  <ImageUploader
                    value={draftVision.customBackgroundData || null}
                    onChange={handleCustomBackgroundChange}
                  />
                ) : (
                  <UpgradePrompt variant="inline" />
                )}
              </div>
            </Card>

            {/* Font Customization (Premium) */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getMessage('fontCustomization')}
                </h2>
                {!isPremium && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    {getMessage('premium')}
                  </span>
                )}
              </div>
              {isPremium ? (
                <FontPicker
                  value={draftVision.fontSettings || DEFAULT_FONT_SETTINGS}
                  onChange={handleFontSettingsChange}
                  previewText={draftVision.goalText || 'Focus on your goals'}
                />
              ) : (
                <UpgradePrompt variant="inline" />
              )}
            </Card>

            {/* Multiple Goals (Premium) */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getMessage('multipleGoals')}
                </h2>
                {!isPremium && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    {getMessage('premium')}
                  </span>
                )}
              </div>
              {isPremium ? (
                <GoalList
                  goals={draftVision.goals || []}
                  onAdd={handleAddGoal}
                  onUpdate={handleUpdateGoal}
                  onDelete={handleDeleteGoal}
                  onReorder={handleReorderGoals}
                />
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    {getMessage('maxGoalsReached', String(featureLimits.maxGoals))}
                  </p>
                  <UpgradePrompt variant="inline" />
                </>
              )}
            </Card>

            {/* Dashboard Preview */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('dashboardPreview')}
              </h2>
              <div
                className="relative aspect-video rounded-lg overflow-hidden"
                style={
                  draftVision.backgroundType === 'color'
                    ? { backgroundColor: draftVision.backgroundColor }
                    : {
                        backgroundImage: `url(${chrome.runtime.getURL(
                          `assets/images/backgrounds/${draftVision.backgroundImage || 'default-1'}.png`
                        )})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                }
              >
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                  <p
                    className="text-lg md:text-xl font-bold text-center drop-shadow-lg"
                    style={{ color: draftVision.textColor }}
                  >
                    {draftVision.goalText || 'Your goal will appear here'}
                  </p>
                  {draftVision.goalSubText && (
                    <p
                      className="text-sm text-center drop-shadow-lg mt-2 opacity-80 whitespace-pre-line"
                      style={{ color: draftVision.textColor }}
                    >
                      {draftVision.goalSubText}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <div className="bg-white/90 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-red-500">{getMessage('waste')}</p>
                      <p className="text-sm font-bold text-red-600">0:00</p>
                    </div>
                    <div className="bg-white/90 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-green-500">{getMessage('invest')}</p>
                      <p className="text-sm font-bold text-green-600">0:00</p>
                    </div>
                    <div className="bg-white/90 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-amber-500">{getMessage('blocked')}</p>
                      <p className="text-sm font-bold text-amber-600">0</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSaveVision}
                disabled={!draftVision.goalText.trim() || !isDirty || visionSaved}
                variant={visionSaved ? 'secondary' : 'primary'}
              >
                {visionSaved ? getMessage('saved') : getMessage('saveChanges')}
              </Button>
              {isDirty && (
                <p className="text-sm text-amber-600">
                  {getMessage('unsavedChanges')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Block List Tab */}
        {activeTab === 'blocklist' && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('addSiteToBlock')}
              </h2>
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={setNewDomain}
                  placeholder={getMessage('domainPlaceholder')}
                  className="flex-1"
                />
                <Button onClick={handleAddDomain}>
                  <Plus className="w-4 h-4 mr-1" />
                  {getMessage('add')}
                </Button>
              </div>
              {blockError && (
                <p className="mt-2 text-sm text-red-600">{blockError}</p>
              )}
              {!isPremium ? (
                <p className="mt-2 text-sm text-gray-500">
                  {getMessage('freeTierLimit', [
                    String(settings?.blockList.length || 0),
                    String(featureLimits.maxBlockList),
                  ])}
                </p>
              ) : (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  {getMessage('premiumFeatureUnlimitedBlocklist')}
                </p>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('blockedSites')}
              </h2>
              {settings?.blockList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {getMessage('noBlockedSites')}
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {settings?.blockList.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.isWildcard && (
                            <span className="text-blue-600">*.</span>
                          )}
                          {item.domain}
                        </p>
                        <p className="text-xs text-gray-500">
                          Added {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDomain(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getMessage('blockingSchedules')}
                </h2>
                <Button
                  onClick={() => {
                    setEditingSchedule(null)
                    setScheduleForm({
                      name: '',
                      startTime: '09:00',
                      endTime: '17:00',
                      days: [1, 2, 3, 4, 5],
                    })
                    setShowScheduleModal(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {getMessage('addSchedule')}
                </Button>
              </div>

              {settings?.schedules.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {getMessage('noSchedules')}
                </p>
              ) : (
                <div className="space-y-3">
                  {settings?.schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {schedule.name}
                          </p>
                          <Toggle
                            checked={schedule.enabled}
                            onChange={(enabled) =>
                              handleToggleSchedule(schedule.id, enabled)
                            }
                          />
                        </div>
                        <p className="text-sm text-gray-500">
                          {schedule.startTime} - {schedule.endTime}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {dayNames.map((day, idx) => (
                            <span
                              key={day}
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                schedule.days.includes(idx)
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-200 text-gray-400'
                              }`}
                            >
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSchedule(schedule)}
                        >
                          {getMessage('edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Site Category Management */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('siteCategories')}
              </h2>
              <SiteCategoryManager
                analytics={analyticsData}
                onCategoryChange={handleSiteCategoryChange}
              />
            </Card>

            {/* Detailed Analytics Chart (Premium) */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getMessage('detailedAnalytics')}
                </h2>
                {!isPremium && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    {getMessage('premium')}
                  </span>
                )}
              </div>
              {isPremium ? (
                <AnalyticsChart analytics={analyticsData} />
              ) : (
                <UpgradePrompt variant="inline" />
              )}
            </Card>

            {/* Weekly & Monthly Reports (Premium) */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getMessage('reports')}
                </h2>
                {!isPremium && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    {getMessage('premium')}
                  </span>
                )}
              </div>
              {isPremium ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ReportCard analytics={analyticsData} type="weekly" />
                  <ReportCard analytics={analyticsData} type="monthly" />
                </div>
              ) : (
                <UpgradePrompt variant="inline" />
              )}
            </Card>

            {/* Recent Activity */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('recentActivity')}
              </h2>
              {recentAnalytics.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {getMessage('noActivity')}
                </p>
              ) : (
                <div className="space-y-3">
                  {recentAnalytics.map(([date, data]) => (
                    <div key={date} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">
                          {date === getTodayKey()
                            ? getMessage('today')
                            : new Date(date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getMessage('blocks', String(data.blockCount))}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-gray-600">
                            {getMessage('waste')}: {formatTime(data.wasteTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-600">
                            {getMessage('invest')}: {formatTime(data.investTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* License Tab */}
        {activeTab === 'license' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getMessage('currentPlan')}
                </h2>
                {isPremium && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    <Crown className="w-4 h-4" />
                    {getMessage('premium')}
                  </span>
                )}
              </div>

              {isPremium ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {getMessage('premiumPlan')}
                        </p>
                        {premiumSource === 'devMode' && devModeRemaining && (
                          <p className="text-sm text-amber-600">
                            {getMessage('devModeExpires', devModeRemaining)}
                          </p>
                        )}
                        {premiumSource === 'license' && premiumExpires && (
                          <p className="text-sm text-gray-500">
                            {getMessage('licenseExpires', formatDate(premiumExpires))}
                          </p>
                        )}
                        {premiumSource === 'license' && !premiumExpires && (
                          <p className="text-sm text-gray-500">
                            {getMessage('licenseLifetime')}
                          </p>
                        )}
                        {premiumSource === 'gracePeriod' && premiumExpires && (
                          <p className="text-sm text-amber-600">
                            {getMessage('gracePeriodWarning', formatDate(premiumExpires))}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Premium Features List */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      {getMessage('premiumFeatures')}
                    </p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        {getMessage('premiumFeatureUnlimitedBlocklist')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        {getMessage('premiumFeatureUnlimitedHistory')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        {getMessage('premiumFeatureCustomBackground')}
                      </li>
                    </ul>
                  </div>

                  {/* Dev Mode Controls */}
                  {premiumSource === 'devMode' && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDisableDevMode}
                      >
                        {getMessage('devModeDisabled')}
                      </Button>
                    </div>
                  )}

                  {/* Deactivate License */}
                  {premiumSource === 'license' && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeactivateLicense}
                        className="text-red-500 hover:text-red-600"
                      >
                        {getMessage('deactivateLicense')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <Key className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {getMessage('freePlan')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getMessage('freeTierLimit', [
                            String(settings?.blockList.length || 0),
                            String(FREE_TIER_LIMITS.maxBlockList),
                          ])}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upgrade Prompt */}
                  <UpgradePrompt variant="card" showFeatures={true} />
                </div>
              )}
            </Card>

            {/* License Key Input */}
            {!isPremium && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {getMessage('licenseKey')}
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={licenseKeyInput}
                      onChange={setLicenseKeyInput}
                      placeholder={getMessage('enterLicenseKey')}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleActivateLicense}
                      loading={activatingLicense}
                      disabled={!licenseKeyInput.trim()}
                    >
                      {activatingLicense
                        ? getMessage('activating')
                        : getMessage('activateLicense')}
                    </Button>
                  </div>
                  {licenseError && (
                    <p className="text-sm text-red-600">{licenseError}</p>
                  )}
                  {licenseSuccess && (
                    <p className="text-sm text-green-600">{licenseSuccess}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {getMessage('upgradeToAddMore')}{' '}
                    <a
                      href={getGumroadPurchaseUrl('lifetime')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline inline-flex items-center gap-1"
                    >
                      {getMessage('getPremium')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Dev Mode Modal */}
      <Modal
        isOpen={showDevModeInput}
        onClose={() => {
          setShowDevModeInput(false)
          setDevModeSecret('')
        }}
        title="Developer Mode"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the developer secret key to enable dev mode for 24 hours.
          </p>
          <Input
            value={devModeSecret}
            onChange={setDevModeSecret}
            placeholder="Secret key"
            type="password"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDevModeInput(false)
                setDevModeSecret('')
              }}
            >
              {getMessage('cancel')}
            </Button>
            <Button
              onClick={handleEnableDevMode}
              disabled={!devModeSecret.trim()}
            >
              Enable
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={editingSchedule ? getMessage('editSchedule') : getMessage('addSchedule')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getMessage('scheduleName')}
            </label>
            <Input
              value={scheduleForm.name}
              onChange={(value) =>
                setScheduleForm((prev) => ({ ...prev, name: value }))
              }
              placeholder=""
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getMessage('startTime')}
              </label>
              <input
                type="time"
                value={scheduleForm.startTime}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getMessage('endTime')}
              </label>
              <input
                type="time"
                value={scheduleForm.endTime}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getMessage('activeDays')}
            </label>
            <div className="flex gap-2">
              {dayNames.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => toggleDay(idx)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scheduleForm.days.includes(idx)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowScheduleModal(false)}
            >
              {getMessage('cancel')}
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={!scheduleForm.name.trim()}
            >
              {editingSchedule ? getMessage('saveChanges') : getMessage('addSchedule')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default OptionsApp
