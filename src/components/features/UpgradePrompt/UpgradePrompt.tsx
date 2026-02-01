import React from 'react'
import { Crown, Check } from 'lucide-react'

import { Button, Card } from '~/components/ui'
import { getMessage } from '~/lib/i18n'
import { openPaymentPage } from '~/lib/extpay'

export interface UpgradePromptProps {
  /** Type of limit reached */
  limitType?: 'blocklist' | 'history' | 'goals' | 'customBackground'
  /** Show as a modal/card or inline */
  variant?: 'card' | 'inline' | 'banner'
  /** Custom message to display */
  message?: string
  /** Callback when upgrade button is clicked */
  onUpgradeClick?: () => void
  /** Show feature list */
  showFeatures?: boolean
  /** Custom features list to display (overrides default) */
  features?: string[]
}

const PREMIUM_FEATURES = [
  'premiumFeatureUnlimitedHistory',
  'premiumFeatureCustomBackground',
  'premiumFeatureReports',
]

export function UpgradePrompt({
  limitType = 'blocklist',
  variant = 'card',
  message,
  onUpgradeClick,
  showFeatures = true,
  features,
}: UpgradePromptProps) {
  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick()
    } else {
      // Open ExtensionPay payment page
      openPaymentPage()
    }
  }

  const defaultMessage =
    limitType === 'blocklist'
      ? getMessage('upgradeToAddMore')
      : limitType === 'history'
        ? 'Upgrade to Premium for unlimited analytics history.'
        : limitType === 'customBackground'
          ? getMessage('upgradeForCustomBackground')
          : 'Upgrade to Premium for unlimited goals.'

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
        <Crown className="w-4 h-4 flex-shrink-0" />
        <span>{message || defaultMessage}</span>
        <button
          onClick={handleUpgradeClick}
          className="text-amber-700 font-medium hover:underline ml-auto"
        >
          {getMessage('upgradeToPremium')}
        </button>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5" />
          <div>
            <p className="font-medium">{getMessage('freeTierLimitReached')}</p>
            <p className="text-sm text-primary-100">
              {message || defaultMessage}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUpgradeClick}
          className="bg-white text-primary-600 hover:bg-primary-50"
        >
          {getMessage('upgradeToPremium')}
        </Button>
      </div>
    )
  }

  // Card variant (default)
  return (
    <Card variant="elevated" padding="lg" className="border-primary-200">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
          <Crown className="w-6 h-6 text-primary-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {getMessage('freeTierLimitReached')}
        </h3>

        <p className="text-gray-600 mb-6">{message || defaultMessage}</p>

        {showFeatures && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {getMessage('premiumFeatures')}
            </h4>
            <ul className="space-y-2">
              {(features || PREMIUM_FEATURES.map((key) => getMessage(key))).map(
                (feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        <Button onClick={handleUpgradeClick} fullWidth>
          <Crown className="w-4 h-4" />
          {getMessage('upgradeToPremium')}
        </Button>
      </div>
    </Card>
  )
}
