import React, { useCallback, useEffect, useState } from 'react'

import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import { Ban, Clock, TrendingUp } from 'lucide-react'

import {
  GoalCard,
  Header,
  LockdownButton,
  QuickBlockButton,
  StatsCard,
} from '~/components/features'
import { Modal, Button } from '~/components/ui'
import { extractDomain } from '~/lib/domain'
import { getMessage } from '~/lib/i18n'
import { storage } from '~/lib/storage'
import { formatTime } from '~/lib/time'
import type { AppSettings, VisionSettings } from '~/types/storage'
import { DEFAULT_SETTINGS, DEFAULT_VISION } from '~/types/storage'

import './styles/globals.css'

function PopupApp() {
  const [settings] = useStorage<AppSettings>({
    key: 'settings',
    instance: storage,
  }, DEFAULT_SETTINGS)
  const [vision] = useStorage<VisionSettings>({
    key: 'vision',
    instance: storage,
  }, DEFAULT_VISION)
  const [stats, setStats] = useState({
    wasteTime: 0,
    investTime: 0,
    blockCount: 0,
  })
  const [currentDomain, setCurrentDomain] = useState<string | undefined>()
  const [showLockdownModal, setShowLockdownModal] = useState(false)

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
      } catch (error) {
        console.error('Failed to get current tab:', error)
      }
    }

    getCurrentDomain()
  }, [])

  const handleSettingsClick = useCallback(() => {
    chrome.runtime.openOptionsPage()
  }, [])

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
    } catch (error) {
      console.error('Failed to block domain:', error)
    }
  }, [])

  const handleLockdownToggle = useCallback(
    async (active: boolean) => {
      if (active && !settings?.lockdownMode) {
        setShowLockdownModal(true)
      } else {
        // Disable lockdown
        try {
          await sendToBackground({
            name: 'toggle-lockdown',
            body: { enabled: false },
          })
        } catch (error) {
          console.error('Failed to toggle lockdown:', error)
        }
      }
    },
    [settings?.lockdownMode]
  )

  const handleConfirmLockdown = useCallback(async () => {
    try {
      await sendToBackground({
        name: 'toggle-lockdown',
        body: { enabled: true },
      })
      setShowLockdownModal(false)
    } catch (error) {
      console.error('Failed to enable lockdown:', error)
    }
  }, [])

  return (
    <div className="popup-container bg-white">
      <Header onSettingsClick={handleSettingsClick} />

      <div className="p-4 space-y-4">
        {/* Goal Card */}
        <GoalCard
          goalText={vision?.goalText || DEFAULT_VISION.goalText}
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

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <LockdownButton
            isActive={settings?.lockdownMode || false}
            onToggle={handleLockdownToggle}
          />
          <QuickBlockButton
            currentDomain={currentDomain}
            onBlock={handleBlock}
          />
        </div>
      </div>

      {/* Lockdown Confirmation Modal */}
      <Modal
        isOpen={showLockdownModal}
        onClose={() => setShowLockdownModal(false)}
        title={getMessage('lockdownConfirmTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">{getMessage('lockdownConfirmMessage')}</p>
          <p className="text-sm text-amber-600">
            {getMessage('lockdownConfirmWarning')}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowLockdownModal(false)}
            >
              {getMessage('cancel')}
            </Button>
            <Button variant="danger" onClick={handleConfirmLockdown}>
              {getMessage('enableLockdown')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PopupApp
