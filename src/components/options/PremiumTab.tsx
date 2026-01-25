import React from 'react'
import { Check, Crown } from 'lucide-react'

import { Button, Card } from '~/components/ui'
import { getMessage } from '~/lib/i18n'
import type { AppSettings } from '~/types/storage'
import { FREE_TIER_LIMITS } from '~/types/storage'

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
  return (
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
                  <p className="text-sm text-gray-500">
                    {getMessage('subscriptionActive')}
                  </p>
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

            {/* Manage Subscription */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={onManageSubscription}
              >
                {getMessage('manageSubscription')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-gray-600" />
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

            {/* Upgrade Button */}
            <Button onClick={onUpgrade} className="w-full">
              <Crown className="w-4 h-4" />
              {getMessage('upgradeToPremium')}
            </Button>

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
          </div>
        )}
      </Card>
    </div>
  )
}
