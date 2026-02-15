import React from 'react';
import { Wrench, ChevronRight } from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/**
 * Troubleshooting セクションコンポーネント
 * トラブルシューティング情報を表示
 */
export function HelpTroubleshooting() {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
          <Wrench className="w-5 h-5 text-danger-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {getMessage('helpTroubleshooting')}
          </h2>
          <p className="text-sm text-gray-500">
            {getMessage('helpTroubleshootingDescription')}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
        {[
          {
            q: getMessage('helpTroubleshootSiteNotBlocked'),
            a: getMessage('helpTroubleshootSiteNotBlockedAnswer')
          },
          {
            q: getMessage('helpTroubleshootNewTab'),
            a: getMessage('helpTroubleshootNewTabAnswer')
          },
          {
            q: getMessage('helpTroubleshootSchedule'),
            a: getMessage('helpTroubleshootScheduleAnswer')
          },
          {
            q: getMessage('helpTroubleshootSettingsReset'),
            a: getMessage('helpTroubleshootSettingsResetAnswer')
          }
        ].map((item) => (
          <details key={item.q} className="group">
            <summary className="cursor-pointer flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-90" />
              {item.q}
            </summary>
            <p className="px-4 pb-3 pl-10 text-sm text-gray-500">{item.a}</p>
          </details>
        ))}
      </div>
    </Card>
  );
}
