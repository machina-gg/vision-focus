import React, { useMemo } from 'react';
import { Shield, Unlock } from 'lucide-react';

import { Card } from '~/components/ui';
import { retentionRange } from '~/hooks/useActivityStats';
import { rankSites } from '~/lib/activityStats';
import { getMessage } from '~/lib/i18n';
import type { ActivityLog } from '~/types/activity';
import type { SiteKey } from '~/types/site';

const RANKING_LIMIT = 10;

interface SiteRankingListProps {
  activity: ActivityLog;
  sites: readonly SiteKey[];
}

export function SiteRankingList({ activity, sites }: SiteRankingListProps) {
  const { topBlockedSites, unblocksBySite } = useMemo(() => {
    const range = retentionRange(new Date());
    return {
      topBlockedSites: rankSites(
        activity,
        sites,
        range,
        'blocks',
        RANKING_LIMIT
      ),
      unblocksBySite: new Map(
        rankSites(activity, sites, range, 'unblocks', sites.length).map(
          ({ domain, value }) => [domain, value]
        )
      )
    };
  }, [activity, sites]);

  if (topBlockedSites.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-danger-500" />
        <h3
          className="text-lg font-semibold text-gray-900"
          data-testid="analytics-top-sites-heading"
        >
          {getMessage('topBlockedSites')}
        </h3>
      </div>
      <div className="space-y-2">
        {topBlockedSites.map((site, index) => {
          const unblockCount = unblocksBySite.get(site.domain) ?? 0;
          return (
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
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-danger-100 text-danger-700 text-sm font-medium rounded-full">
                  <Shield className="w-3.5 h-3.5" />
                  {getMessage('blockedTimesShort', site.value.toString())}
                </span>
                {unblockCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-warning-100 text-warning-700 text-sm font-medium rounded-full">
                    <Unlock className="w-3.5 h-3.5" />
                    {unblockCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
