import React from 'react';
import { ExternalLink, Mail } from 'lucide-react';

import { Card } from '~/components/ui';
import { SupportSection } from '~/components/features';
import { HelpGettingStarted } from '~/components/options/HelpGettingStarted';
import { HelpFAQ } from '~/components/options/HelpFAQ';
import { HelpTroubleshooting } from '~/components/options/HelpTroubleshooting';
import { getMessage } from '~/lib/i18n';

const VERSION = '1.0.0';

export function HelpTab() {
  return (
    <div className="space-y-6">
      <HelpGettingStarted />

      <HelpFAQ />

      <HelpTroubleshooting />

      <SupportSection />

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-premium-100 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-premium-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getMessage('helpSupport')}
            </h2>
            <p className="text-sm text-gray-500">
              {getMessage('helpSupportDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSf3yxG71Z4YQWkoZqBMFuUb0Zxvj0DQFS9FEODjUVDQSnzXhg/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-info-600 hover:text-info-800"
          >
            <ExternalLink className="w-4 h-4" />
            {getMessage('helpContactUs')}
          </a>
        </div>
      </Card>

      <div className="text-center text-xs text-gray-400">
        <p>VisionFocus v{VERSION}</p>
      </div>
    </div>
  );
}
