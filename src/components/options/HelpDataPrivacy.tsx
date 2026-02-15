import React from 'react';
import { BarChart3 } from 'lucide-react';

import { Card, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { AnalyticsOptIn, AppSettings } from '~/types/storage';

interface HelpDataPrivacyProps {
  settings?: AppSettings;
  onAnalyticsOptInChange: (optIn: AnalyticsOptIn) => Promise<void>;
}

/**
 * Data & Privacy セクションコンポーネント
 * 分析データの共有設定を管理
 */
export function HelpDataPrivacy({
  settings,
  onAnalyticsOptInChange
}: HelpDataPrivacyProps) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {getMessage('analyticsPrivacyTitle')}
          </h2>
          <p className="text-sm text-gray-500">
            {getMessage('analyticsPrivacyDescription')}
          </p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <h3 className="font-medium text-gray-800 mb-1">
              {getMessage('analyticsShareStats')}
            </h3>
            <p className="text-sm text-gray-600">
              {getMessage('analyticsShareStatsDescription')}
            </p>
          </div>
          <Toggle
            checked={settings?.analyticsOptIn?.enabled === true}
            onChange={(checked) =>
              onAnalyticsOptInChange({
                enabled: checked,
                decidedAt: new Date().toISOString()
              })
            }
            size="sm"
          />
        </div>
      </div>
    </Card>
  );
}
