import React, { useMemo } from 'react'
import { Check, X, Crown, Lock, Sparkles } from 'lucide-react'

import { Button, Card } from '~/components/ui'
import { getMessage } from '~/lib/i18n'
import type { AppSettings } from '~/types/storage'
import { FEATURE_LIMITS } from '~/types/storage'

interface PremiumTabProps {
  settings: AppSettings | undefined
  isPremium: boolean
  onUpgrade: () => void
  onManageSubscription: () => void
}

export function PremiumTab({
  settings,
  isPremium,
  onUpgrade,
  onManageSubscription,
}: PremiumTabProps) {
  const blockListCount = settings?.blockList.length || 0
  const blockListLimit = FEATURE_LIMITS.free.maxBlockList
  const usagePercent = Math.min((blockListCount / blockListLimit) * 100, 100)
  const isNearLimit = blockListCount >= blockListLimit - 1
  const isAtLimit = blockListCount >= blockListLimit

  // Comparison table data - computed to use i18n
  const comparisonFeatures = useMemo(
    () => [
      {
        name: getMessage('featureBlocklist'),
        free: getMessage(
          'featureBlocklistFree',
          String(FEATURE_LIMITS.free.maxBlockList)
        ),
        premium: getMessage('featureUnlimited'),
        highlight: true,
      },
      {
        name: getMessage('featureHistoryRetention'),
        free: getMessage(
          'featureHistoryDays',
          String(FEATURE_LIMITS.free.historyDays)
        ),
        premium: getMessage('featureAllTime'),
        highlight: true,
      },
      {
        name: getMessage('featurePresets'),
        free: getMessage(
          'featurePresetCount',
          String(FEATURE_LIMITS.free.maxPresets)
        ),
        premium: getMessage(
          'featurePresetCount',
          String(FEATURE_LIMITS.premium.maxPresets)
        ),
        highlight: false,
      },
      {
        name: getMessage('featureCustomBackground'),
        free: null,
        premium: true,
        highlight: true,
      },
      {
        name: getMessage('featureWallpaperDownload'),
        free: null,
        premium: true,
        highlight: true,
      },
      {
        name: getMessage('featureWeeklyMonthlyReports'),
        free: null,
        premium: true,
        highlight: false,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      {isPremium ? (
        // Premium user view
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {getMessage('currentPlan')}
            </h2>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-full text-sm font-bold shadow-sm">
              <Crown className="w-4 h-4" />
              Premium
            </span>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {getMessage('premiumActiveTitle')}
                </p>
                <p className="text-sm text-gray-600">
                  {getMessage('premiumActiveDescription')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={onManageSubscription}
            >
              {getMessage('manageSubscription')}
            </Button>
          </div>
        </Card>
      ) : (
        // Free user view
        <>
          {/* Usage Visualization */}
          <Card className={isAtLimit ? 'ring-2 ring-red-200' : ''}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                {getMessage('currentUsage')}
              </h3>
              <span className="text-sm text-gray-500">
                {getMessage('freePlan')}
              </span>
            </div>

            <div className="space-y-3">
              {/* Blocklist usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    {getMessage('featureBlocklist')}
                  </span>
                  <span
                    className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-900'}`}
                  >
                    {blockListCount} / {blockListLimit}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isAtLimit
                        ? 'bg-red-500'
                        : isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                {isAtLimit && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {getMessage('limitReachedUpgrade')}
                  </p>
                )}
                {isNearLimit && !isAtLimit && (
                  <p className="text-xs text-amber-600 mt-1">
                    {getMessage(
                      'limitWarning',
                      String(blockListLimit - blockListCount)
                    )}
                  </p>
                )}
              </div>

              {/* Other limits */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">
                    {getMessage('historySaving')}
                  </p>
                  <p className="font-medium text-gray-900">
                    {getMessage(
                      'featureHistoryDays',
                      String(FEATURE_LIMITS.free.historyDays)
                    )}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">
                    {getMessage('featurePresets')}
                  </p>
                  <p className="font-medium text-gray-900">
                    {getMessage(
                      'featureBlocklistFree',
                      String(FEATURE_LIMITS.free.maxPresets)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Upgrade CTA with Price Anchoring */}
          <Card className="bg-gradient-to-br from-sky-50 to-blue-100 border border-blue-200">
            <div className="text-center">
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium mb-3">
                <Sparkles className="w-4 h-4" />
                Premium
              </div>

              <h2 className="text-2xl font-bold mb-2 text-gray-800">
                {getMessage('premiumMarketingHeadline')}
              </h2>

              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-4xl font-bold text-blue-600">$2.99</span>
                <span className="text-gray-500">/月</span>
              </div>

              <p className="text-gray-600 text-sm mb-1">
                {getMessage('premiumMarketingPrice')}
              </p>
              <p className="text-gray-400 text-xs mb-4">
                {getMessage('premiumMarketingPriceNote')}
              </p>

              <Button
                onClick={onUpgrade}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3"
              >
                <Crown className="w-5 h-5" />
                {getMessage('upgradeToPremium')}
              </Button>

              <p className="text-xs text-gray-400 mt-3">
                {getMessage('cancelAnytime')}
              </p>
            </div>
          </Card>

          {/* Comparison Table */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">
              {getMessage('planComparison')}
            </h3>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      {getMessage('featureColumn')}
                    </th>
                    <th className="text-center py-3 px-3 font-medium text-gray-600 w-24">
                      Free
                    </th>
                    <th className="text-center py-3 px-3 font-medium text-blue-600 w-24 bg-blue-50">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparisonFeatures.map((feature, index) => (
                    <tr
                      key={index}
                      className={feature.highlight ? 'bg-amber-50/50' : ''}
                    >
                      <td className="py-3 px-4 text-gray-700">{feature.name}</td>
                      <td className="py-3 px-3 text-center">
                        {feature.free === null ? (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        ) : (
                          <span className="text-gray-600">{feature.free}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center bg-blue-50/50">
                        {feature.premium === true ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="font-medium text-blue-600">
                            {feature.premium}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
