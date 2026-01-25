import React from 'react'
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

// Comparison table data
const COMPARISON_FEATURES = [
  {
    name: 'ブロックリスト',
    free: `${FEATURE_LIMITS.free.maxBlockList}件まで`,
    premium: '無制限',
    highlight: true,
  },
  {
    name: '履歴保存期間',
    free: `${FEATURE_LIMITS.free.historyDays}日間`,
    premium: '無制限',
    highlight: true,
  },
  {
    name: 'プリセット',
    free: `${FEATURE_LIMITS.free.maxPresets}件`,
    premium: `${FEATURE_LIMITS.premium.maxPresets}件`,
    highlight: false,
  },
  {
    name: 'カスタム背景画像',
    free: null,
    premium: true,
    highlight: true,
  },
  {
    name: '壁紙ダウンロード',
    free: null,
    premium: true,
    highlight: true,
  },
  {
    name: '週次・月次レポート',
    free: null,
    premium: true,
    highlight: false,
  },
]

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
                  Premiumプランをご利用中
                </p>
                <p className="text-sm text-gray-600">
                  すべての機能をお楽しみいただけます
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
              <h3 className="font-semibold text-gray-900">現在の使用状況</h3>
              <span className="text-sm text-gray-500">Freeプラン</span>
            </div>

            <div className="space-y-3">
              {/* Blocklist usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">ブロックリスト</span>
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
                    上限に達しました。Premiumで無制限に。
                  </p>
                )}
                {isNearLimit && !isAtLimit && (
                  <p className="text-xs text-amber-600 mt-1">
                    あと{blockListLimit - blockListCount}件で上限です
                  </p>
                )}
              </div>

              {/* Other limits */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">履歴保存</p>
                  <p className="font-medium text-gray-900">
                    {FEATURE_LIMITS.free.historyDays}日間
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">プリセット</p>
                  <p className="font-medium text-gray-900">
                    {FEATURE_LIMITS.free.maxPresets}件まで
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
                もっと集中したいあなたへ
              </h2>

              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-4xl font-bold text-blue-600">$2.99</span>
                <span className="text-gray-500">/月</span>
              </div>

              <p className="text-gray-600 text-sm mb-1">
                1日たった約15円で、無制限の集中環境を
              </p>
              <p className="text-gray-400 text-xs mb-4">
                ※ 1ドル=155円換算
              </p>

              <Button
                onClick={onUpgrade}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3"
              >
                <Crown className="w-5 h-5" />
                Premiumにアップグレード
              </Button>

              <p className="text-xs text-gray-400 mt-3">
                いつでもキャンセル可能
              </p>
            </div>
          </Card>

          {/* Comparison Table */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">プラン比較</h3>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      機能
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
                  {COMPARISON_FEATURES.map((feature, index) => (
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
