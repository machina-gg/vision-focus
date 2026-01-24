import React, { useCallback, useEffect, useState } from 'react'

import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import { AlertTriangle, ArrowLeft, Shield, Target } from 'lucide-react'

import { Button, Card, Input } from '~/components/ui'
import { getMessage } from '~/lib/i18n'
import { storage } from '~/lib/storage'
import type { AppSettings, VisionSettings } from '~/types/storage'
import {
  CHALLENGE_TEXT,
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
} from '~/types/storage'

import '~/styles/globals.css'

function BlockedPage() {
  const [settings] = useStorage<AppSettings>({
    key: 'settings',
    instance: storage,
  }, DEFAULT_SETTINGS)
  const [vision] = useStorage<VisionSettings>({
    key: 'vision',
    instance: storage,
  }, DEFAULT_VISION)
  const [challengeInput, setChallengeInput] = useState('')
  const [error, setError] = useState('')
  const [isUnblocking, setIsUnblocking] = useState(false)
  const [showChallenge, setShowChallenge] = useState(false)

  // Get blocked domain from URL params
  const [blockedDomain, setBlockedDomain] = useState<string>('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const domain = params.get('domain')
    if (domain) {
      setBlockedDomain(domain)
    }
  }, [])

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.close()
    }
  }, [])

  const handleStartChallenge = useCallback(() => {
    setShowChallenge(true)
    setChallengeInput('')
    setError('')
  }, [])

  const handleUnblock = useCallback(async () => {
    if (!blockedDomain) return

    setIsUnblocking(true)
    setError('')

    try {
      const response = await sendToBackground({
        name: 'unblock-challenge',
        body: {
          domain: blockedDomain,
          input: challengeInput,
        },
      })

      if (response.success) {
        // Redirect back to the blocked site
        window.location.href = `https://${blockedDomain}`
      } else {
        setError(response.error || 'Failed to unblock')
      }
    } catch (err) {
      setError('Failed to process unblock request')
    } finally {
      setIsUnblocking(false)
    }
  }, [blockedDomain, challengeInput])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleUnblock()
      }
    },
    [handleUnblock]
  )

  const isChallengeEnabled = settings?.challengeEnabled ?? true

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

        {/* Challenge Section */}
        <Card className="bg-white/80 backdrop-blur">
          {!showChallenge ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {isChallengeEnabled
                  ? getMessage('challengeDescription')
                  : getMessage('unblockPrompt')}
              </p>
              <Button
                variant="secondary"
                onClick={handleStartChallenge}
                className="w-full"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {getMessage('temporarilyUnblock')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {isChallengeEnabled ? (
                <>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {getMessage('challengePrompt')}
                    </h3>
                    <p className="text-gray-700 bg-gray-100 p-3 rounded-lg font-mono text-sm">
                      {CHALLENGE_TEXT}
                    </p>
                  </div>
                  <Input
                    value={challengeInput}
                    onChange={setChallengeInput}
                    onKeyDown={handleKeyDown}
                    placeholder={getMessage('typeTextAbove')}
                    autoFocus
                  />
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setShowChallenge(false)}
                      className="flex-1"
                    >
                      {getMessage('cancel')}
                    </Button>
                    <Button
                      onClick={handleUnblock}
                      disabled={
                        isUnblocking ||
                        challengeInput.trim() !== CHALLENGE_TEXT
                      }
                      className="flex-1"
                    >
                      {isUnblocking ? getMessage('unblocking') : getMessage('confirm')}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 text-center">
                    {getMessage('confirmUnblock')}
                  </p>
                  {error && (
                    <p className="text-red-600 text-sm text-center">
                      {error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setShowChallenge(false)}
                      className="flex-1"
                    >
                      {getMessage('cancel')}
                    </Button>
                    <Button
                      onClick={handleUnblock}
                      disabled={isUnblocking}
                      className="flex-1"
                    >
                      {isUnblocking ? getMessage('unblocking') : getMessage('confirm')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Go Back Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {getMessage('goBack')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BlockedPage
