import React, { useCallback } from 'react';
import { Heart } from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { trackFeatureUse } from '~/lib/analytics';
import { openSupportPage } from '~/lib/supportPrompt';
import { SupportButton } from './SupportButton';

/**
 * ヘルプタブに常設する支援セクション
 *
 * ユーザーが自分の意思で設定を見に来る場所なので、頻度制御はせず常に表示する。
 */
export function SupportSection() {
  const handleClick = useCallback(() => {
    void trackFeatureUse('support_open');
    openSupportPage();
  }, []);

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-premium-100 rounded-lg flex items-center justify-center">
          <Heart className="w-5 h-5 text-premium-600" />
        </div>
        <div>
          <h2
            className="text-lg font-semibold text-gray-900"
            data-testid="support-section-title"
          >
            {getMessage('supportTitle')}
          </h2>
          <p className="text-sm text-gray-500">
            {getMessage('supportDescription')}
          </p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        <p className="text-sm text-gray-700">{getMessage('supportBody')}</p>
        <SupportButton onClick={handleClick} />
      </div>
    </Card>
  );
}
