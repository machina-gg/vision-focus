import React from 'react';
import { MessageCircle, ChevronRight } from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/**
 * FAQ セクションコンポーネント
 * よくある質問と回答を表示
 */
export function HelpFAQ() {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-success-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {getMessage('helpFaq')}
          </h2>
          <p className="text-sm text-gray-500">
            {getMessage('helpFaqDescription')}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
        {[
          {
            q: getMessage('helpFaqWildcard'),
            a: getMessage('helpFaqWildcardAnswer')
          },
          {
            q: getMessage('helpFaqPause'),
            a: getMessage('helpFaqPauseAnswer')
          },
          {
            q: getMessage('helpFaqPresets'),
            a: getMessage('helpFaqPresetsAnswer')
          },
          {
            q: getMessage('helpFaqTimeLimit'),
            a: getMessage('helpFaqTimeLimitAnswer')
          },
          {
            q: getMessage('helpFaqPassword'),
            a: getMessage('helpFaqPasswordAnswer')
          },
          {
            q: getMessage('helpFaqBackup'),
            a: getMessage('helpFaqBackupAnswer')
          },
          {
            q: getMessage('helpFaqPremium'),
            a: getMessage('helpFaqPremiumAnswer')
          },
          {
            q: getMessage('helpFaqDataStorage'),
            a: getMessage('helpFaqDataStorageAnswer')
          },
          {
            q: getMessage('helpFaqBlockLimit'),
            a: getMessage('helpFaqBlockLimitAnswer')
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
