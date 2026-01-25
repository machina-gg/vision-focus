import React from 'react'
import { Clock, TrendingUp } from 'lucide-react'

import { Card } from '~/components/ui'
import {
  UpgradePrompt,
  AnalyticsChart,
  ReportCard,
  SiteCategoryManager,
} from '~/components/features'
import { formatTime, getTodayKey } from '~/lib/time'
import { getMessage } from '~/lib/i18n'
import type { AnalyticsData } from '~/types/storage'

interface AnalyticsTabProps {
  analyticsData: AnalyticsData
  isPremium: boolean
  onSiteCategoryChange: (
    domain: string,
    category: 'waste' | 'invest' | 'neutral'
  ) => void
}

export function AnalyticsTab({
  analyticsData,
  isPremium,
  onSiteCategoryChange,
}: AnalyticsTabProps) {
  // Get recent analytics
  const recentAnalytics = Object.entries(analyticsData.dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)

  return (
    <div className="space-y-6">
      {/* Site Category Management */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {getMessage('siteCategories')}
        </h2>
        <SiteCategoryManager
          analytics={analyticsData}
          onCategoryChange={onSiteCategoryChange}
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
  )
}
