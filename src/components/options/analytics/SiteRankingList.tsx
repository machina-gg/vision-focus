import React, { useMemo } from 'react';
import { Shield } from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { AnalyticsData } from '~/types/storage';

interface SiteRankingListProps {
  analyticsData: AnalyticsData;
}

export function SiteRankingList({ analyticsData }: SiteRankingListProps) {
  const topBlockedSites = useMemo(() => {
    const counts = Object.values(analyticsData.siteBlockCounts || {});
    return counts.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [analyticsData.siteBlockCounts]);

  if (topBlockedSites.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-900">
          {getMessage('topBlockedSites')}
        </h3>
      </div>
      <div className="space-y-2">
        {topBlockedSites.map((site, index) => (
          <div
            key={site.domain}
            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center text-sm font-medium text-gray-500 bg-gray-200 rounded-full">
                {index + 1}
              </span>
              <span className="font-medium text-gray-900">{site.domain}</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
              <Shield className="w-3.5 h-3.5" />
              {getMessage('blockedTimesShort', site.count.toString())}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
