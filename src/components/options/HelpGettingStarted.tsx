import React from 'react';
import {
  BookOpen,
  Shield,
  Calendar,
  BarChart2,
  Clock,
  BarChart3
} from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/**
 * Getting Started セクションコンポーネント
 * VisionFocus の主要機能を説明するカード
 */
export function HelpGettingStarted() {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-info-600" />
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

      <div className="space-y-3 text-sm">
        {[
          {
            icon: Shield,
            color: 'text-danger-500',
            bg: 'bg-danger-50',
            title: getMessage('helpBlockSites'),
            desc: getMessage('helpBlockSitesDescription')
          },
          {
            icon: Calendar,
            color: 'text-info-500',
            bg: 'bg-info-50',
            title: getMessage('helpSchedules'),
            desc: getMessage('helpSchedulesDescription')
          },
          {
            icon: BarChart2,
            color: 'text-success-500',
            bg: 'bg-success-50',
            title: getMessage('helpDashboard'),
            desc: getMessage('helpDashboardDescription')
          },
          {
            icon: Clock,
            color: 'text-warning-500',
            bg: 'bg-warning-50',
            title: getMessage('helpTimeLimits'),
            desc: getMessage('helpTimeLimitsDescription')
          },
          {
            icon: BarChart3,
            color: 'text-primary-500',
            bg: 'bg-primary-50',
            title: getMessage('helpAnalytics'),
            desc: getMessage('helpAnalyticsDescription')
          }
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
          >
            <div
              className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}
            >
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">{item.title}</h3>
              <p className="text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
