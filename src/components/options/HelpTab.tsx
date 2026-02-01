import React from 'react';
import { ExternalLink, MessageCircle, BookOpen, Mail } from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

const VERSION = '1.0.0';

export function HelpTab() {
  return (
    <div className="space-y-6">
      {/* Getting Started */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getMessage('helpGettingStarted')}
            </h2>
            <p className="text-sm text-gray-500">
              {getMessage('helpGettingStartedDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-800 mb-1">
              {getMessage('helpBlockSites')}
            </h3>
            <p>{getMessage('helpBlockSitesDescription')}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-1">
              {getMessage('helpSchedules')}
            </h3>
            <p>{getMessage('helpSchedulesDescription')}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-1">
              {getMessage('helpDashboard')}
            </h3>
            <p>{getMessage('helpDashboardDescription')}</p>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
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

        <div className="space-y-4">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-blue-600">
              {getMessage('helpFaqWildcard')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqWildcardAnswer')}
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-blue-600">
              {getMessage('helpFaqPause')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqPauseAnswer')}
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-blue-600">
              {getMessage('helpFaqPresets')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqPresetsAnswer')}
            </p>
          </details>
        </div>
      </Card>

      {/* Support */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-purple-600" />
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
            href="https://github.com/user/vision-focus/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            {getMessage('helpReportIssue')}
          </a>
          <p className="text-xs text-gray-400">
            {getMessage('helpComingSoon')}
          </p>
        </div>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400">
        <p>VisionFocus v{VERSION}</p>
      </div>
    </div>
  );
}
