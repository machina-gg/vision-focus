import React, { useEffect, useState } from 'react'

import { useStorage } from '@plasmohq/storage/hook'
import { Shield, Target } from 'lucide-react'

import { Button, Card } from '~/components/ui'
import { getMessage } from '~/lib/i18n'
import { storage } from '~/lib/storage'
import type { VisionSettings } from '~/types/storage'
import { DEFAULT_VISION } from '~/types/storage'

import '~/styles/globals.css'

function BlockedPage() {
  const [vision] = useStorage<VisionSettings>({
    key: 'vision',
    instance: storage,
  }, DEFAULT_VISION)

  // Get blocked domain from URL params
  const [blockedDomain, setBlockedDomain] = useState<string>('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const domain = params.get('domain')
    if (domain) {
      setBlockedDomain(domain)
    }
  }, [])

  const handleGoToDashboard = () => {
    window.location.href = chrome.runtime.getURL('newtab.html')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Blocked Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{getMessage('siteBlocked')}</h1>
          <p className="text-gray-600 mt-2">
            {getMessage('siteBlockedMessage', blockedDomain)}
          </p>
        </div>

        {/* Goal Reminder Card */}
        <Card className="bg-white/80 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-medium text-gray-900 mb-1">
                {getMessage('rememberGoal')}
              </h2>
              <p className="text-gray-700 font-medium">
                {vision?.goalText || DEFAULT_VISION.goalText}
              </p>
              {vision?.goalSubText && (
                <p className="text-gray-500 text-sm mt-1 whitespace-pre-line">
                  {vision.goalSubText}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Action Button */}
        <Button onClick={handleGoToDashboard} className="w-full">
          {getMessage('goToDashboard')}
        </Button>
      </div>
    </div>
  )
}

export default BlockedPage
