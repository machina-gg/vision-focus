import React, { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Clock,
  Lock,
  RefreshCw,
  Trash2,
  EyeOff,
  RotateCw,
  Plus,
} from 'lucide-react'

import { Card, Button, Modal, Input } from '~/components/ui'
import { UpgradePrompt, AnalyticsChart } from '~/components/features'
import { formatTime } from '~/lib/time'
import { getMessage } from '~/lib/i18n'
import type { UnblockHistory, AnalyticsData } from '~/types/storage'

interface AnalyticsTabProps {
  unblockHistory: UnblockHistory
  analyticsData: AnalyticsData
  isPremium: boolean
  onReblock: (domain: string) => void
  onReset: () => void
  onStopTracking: (domain: string) => void
  onRefresh: () => Promise<void>
  onAddSite: (domain: string) => void
}

// Format relative time (e.g., "3 days ago")
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return getMessage('today')
  } else if (diffDays === 1) {
    return getMessage('yesterday')
  } else if (diffDays < 7) {
    return getMessage('daysAgo', String(diffDays))
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return getMessage('weeksAgo', String(weeks))
  } else {
    const months = Math.floor(diffDays / 30)
    return getMessage('monthsAgo', String(months))
  }
}

export function AnalyticsTab({
  unblockHistory,
  analyticsData,
  isPremium,
  onReblock,
  onReset,
  onStopTracking,
  onRefresh,
  onAddSite,
}: AnalyticsTabProps) {
  const [showResetModal, setShowResetModal] = useState(false)
  const [newSiteDomain, setNewSiteDomain] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleAddSite = () => {
    if (newSiteDomain.trim()) {
      onAddSite(newSiteDomain.trim().toLowerCase())
      setNewSiteDomain('')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    // Keep spinning for a moment so user can see it
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Sort unblocked sites by time spent (descending)
  const sortedSites = useMemo(() => {
    return Object.values(unblockHistory.sites).sort(
      (a, b) => b.timeAfterUnblock - a.timeAfterUnblock
    )
  }, [unblockHistory.sites])

  const hasUnblockedSites = sortedSites.length > 0

  // Calculate total time spent on unblocked sites
  const totalTimeSpent = useMemo(() => {
    return sortedSites.reduce((sum, site) => sum + site.timeAfterUnblock, 0)
  }, [sortedSites])

  const handleReset = () => {
    onReset()
    setShowResetModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getMessage('unblockedSitesTitle')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {getMessage('unblockedSitesDescription')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-gray-500 hover:text-gray-700"
            title={getMessage('refresh')}
          >
            <RotateCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </Card>

      {/* Add Site */}
      <Card>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {getMessage('addSiteToTrack')}
        </h3>
        <div className="flex gap-2">
          <Input
            value={newSiteDomain}
            onChange={(value) => setNewSiteDomain(value)}
            placeholder={getMessage('trackSitePlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
            className="flex-1"
          />
          <Button
            variant="primary"
            onClick={handleAddSite}
            disabled={!newSiteDomain.trim()}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {getMessage('add')}
          </Button>
        </div>
      </Card>

      {/* Empty State */}
      {!hasUnblockedSites && (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">&#10003;</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {getMessage('noUnblockedSites')}
            </h3>
            <p className="text-sm text-gray-500">
              {getMessage('noUnblockedSitesDescription')}
            </p>
          </div>
        </Card>
      )}

      {/* Unblocked Sites List */}
      {hasUnblockedSites && (
        <Card>
          <div className="space-y-4">
            {sortedSites.map((site) => (
              <div
                key={site.domain}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Domain */}
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="font-medium text-gray-900 truncate">
                        {site.domain}
                      </span>
                    </div>

                    {/* Unblocked date */}
                    <p className="text-sm text-gray-500 mt-1">
                      {getMessage('unblockedOn')}:{' '}
                      {formatRelativeTime(site.unblockedAt)}
                    </p>

                    {/* Time spent */}
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {isPremium ? (
                        <span className="text-sm font-medium text-orange-600">
                          {getMessage('timeSpentSinceUnblock')}:{' '}
                          {formatTime(site.timeAfterUnblock)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          {getMessage('timeSpentSinceUnblock')}:{' '}
                          <span className="tracking-widest">******</span>
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {isPremium && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onReblock(site.domain)}
                        className="flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {getMessage('reblock')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onStopTracking(site.domain)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
                    >
                      <EyeOff className="w-4 h-4" />
                      {getMessage('stopTracking')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Total time (Premium only) */}
            {isPremium && sortedSites.length > 1 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {getMessage('totalTimeOnUnblockedSites')}
                  </span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatTime(totalTimeSpent)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Upgrade Prompt for Free Users */}
      {hasUnblockedSites && !isPremium && (
        <Card>
          <UpgradePrompt
            variant="inline"
            features={[
              getMessage('upgradeFeatureViewTime'),
              getMessage('upgradeFeatureReblock'),
              getMessage('upgradeFeatureChart'),
            ]}
          />
        </Card>
      )}

      {/* Analytics Chart (Premium only) */}
      {hasUnblockedSites && isPremium && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {getMessage('usageChart')}
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
              {getMessage('reset')}
            </Button>
          </div>
          <AnalyticsChart
            analytics={analyticsData}
            unblockHistory={unblockHistory}
          />
        </Card>
      )}

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title={getMessage('resetAnalyticsTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {getMessage('resetAnalyticsDescription')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowResetModal(false)}
            >
              {getMessage('cancel')}
            </Button>
            <Button variant="danger" onClick={handleReset}>
              {getMessage('reset')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
