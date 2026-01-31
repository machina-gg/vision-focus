import React, { useCallback, useEffect, useState } from 'react'

import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import { Ban, Clock, TrendingUp } from 'lucide-react'

import {
  GoalCard,
  Header,
  QuickBlockButton,
  StatsCard,
} from '~/components/features'
import { extractDomain } from '~/lib/domain'
import { getMessage, setCurrentLanguage } from '~/lib/i18n'
import { storage } from '~/lib/storage'
import { formatTime } from '~/lib/time'
import type { AppSettings, VisionSettings, SupportedLanguage } from '~/types/storage'
import { DEFAULT_SETTINGS, DEFAULT_VISION } from '~/types/storage'

import './styles/globals.css'


function PopupApp() {
  const [settings, setSettings] = useStorage<AppSettings>(
    {
      key: 'settings',
      instance: storage,
    },
    DEFAULT_SETTINGS
  )
  const [vision] = useStorage<VisionSettings>(
    {
      key: 'vision',
      instance: storage,
    },
    DEFAULT_VISION
  )
  const [stats, setStats] = useState({
    wasteTime: 0,
    investTime: 0,
    blockCount: 0,
  })
  const [currentDomain, setCurrentDomain] = useState<string | undefined>()
  // Force re-render when language changes
  const [, forceUpdate] = useState({})

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language)
    }
  }, [settings?.language])

  // Fetch stats from background
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await sendToBackground({
          name: 'get-stats',
        })
        setStats(response)
      } catch {
        // Silently handle error - stats will refresh on next interval
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  // Get current tab's domain
  useEffect(() => {
    const getCurrentDomain = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        })
        if (tab?.url) {
          const domain = extractDomain(tab.url)
          setCurrentDomain(domain || undefined)
        }
      } catch {
        // Silently handle error - domain will be undefined
      }
    }

    getCurrentDomain()
  }, [])

  const handleSettingsClick = useCallback(() => {
    chrome.runtime.openOptionsPage()
  }, [])

  const handleHelpClick = useCallback(() => {
    // Open options page with help tab selected
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html#help') })
  }, [])

  const handlePausedChange = useCallback(async (paused: boolean) => {
    try {
      await sendToBackground({
        name: 'toggle-pause',
        body: { paused },
      })
    } catch {
      // Silently handle error
    }
  }, [])

  const handleLanguageChange = useCallback(async (language: SupportedLanguage) => {
    // Update i18n module immediately
    setCurrentLanguage(language)
    // Force re-render to update all translated text
    forceUpdate({})
    // Save to storage
    if (settings) {
      await setSettings({ ...settings, language })
    }
  }, [settings, setSettings])

  const handleGoalClick = useCallback(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') })
  }, [])

  const handleBlock = useCallback(async (domain: string) => {
    try {
      const response = await sendToBackground({
        name: 'add-block',
        body: { domain },
      })
      if (response.success) {
        // Show success feedback
        setCurrentDomain(undefined)
      } else {
        alert(response.error || 'Failed to add block')
      }
    } catch {
      // Silently handle error
    }
  }, [])

  return (
    <div className="popup-container bg-white">
      <Header
        onSettingsClick={handleSettingsClick}
        onHelpClick={handleHelpClick}
        paused={settings?.paused ?? false}
        onPausedChange={handlePausedChange}
        language={settings?.language}
        onLanguageChange={handleLanguageChange}
      />

      <div className="p-4 space-y-4">
        {/* Block Websites - Top priority action */}
        <QuickBlockButton
          currentDomain={currentDomain}
          onBlock={handleBlock}
        />

        {/* Goal Card */}
        <GoalCard
          goalText={
            vision?.defaultSettings?.goalText ||
            DEFAULT_VISION.defaultSettings.goalText
          }
          onClick={handleGoalClick}
        />

        {/* Today's Summary */}
        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            {getMessage('todaysSummary')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatsCard
              label={getMessage('waste')}
              value={formatTime(stats.wasteTime)}
              type="waste"
              icon={<Clock className="w-4 h-4" />}
            />
            <StatsCard
              label={getMessage('invest')}
              value={formatTime(stats.investTime)}
              type="invest"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatsCard
              label={getMessage('blocked')}
              value={String(stats.blockCount)}
              type="block"
              icon={<Ban className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PopupApp
