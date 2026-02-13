import React, { useMemo } from 'react';
import { AlertTriangle, Clock, Info, Lock, RefreshCw, EyeOff } from 'lucide-react';

import { Card, Button } from '~/components/ui';
import { UpgradePrompt } from '~/components/features';
import { MS_PER_DAY } from '~/constants/intervals';
import { formatTime } from '~/lib/time';
import { getMessage } from '~/lib/i18n';
import type { UnblockHistory, TrackedSite } from '~/types/storage';

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffDays === 0) {
    return getMessage('today');
  } else if (diffDays === 1) {
    return getMessage('yesterday');
  } else if (diffDays < 7) {
    return getMessage('daysAgo', String(diffDays));
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return getMessage('weeksAgo', String(weeks));
  } else {
    const months = Math.floor(diffDays / 30);
    return getMessage('monthsAgo', String(months));
  }
}

interface AnalyticsSummaryProps {
  unblockHistory: UnblockHistory;
  isPremium: boolean;
  onReblock: (domain: string) => void;
  onStopTracking: (domain: string) => void;
}

export function AnalyticsSummary({
  unblockHistory,
  isPremium,
  onReblock,
  onStopTracking
}: AnalyticsSummaryProps) {
  const { blockedSites, unblockedSites } = useMemo(() => {
    const allSites = Object.values(unblockHistory.sites);
    const blocked = allSites
      .filter((s) => s.status === 'blocked')
      .sort(
        (a, b) =>
          new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime()
      );
    const unblocked = allSites
      .filter((s) => s.status === 'unblocked')
      .sort((a, b) => b.timeAfterUnblock - a.timeAfterUnblock);
    return { blockedSites: blocked, unblockedSites: unblocked };
  }, [unblockHistory.sites]);

  const hasTrackedSites = blockedSites.length > 0 || unblockedSites.length > 0;

  const totalTimeSpent = useMemo(() => {
    return unblockedSites.reduce((sum, site) => sum + site.timeAfterUnblock, 0);
  }, [unblockedSites]);

  return (
    <>
      {/* Empty State */}
      {!hasTrackedSites && (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">&#10003;</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {getMessage('noUnblockedSites')}
            </h3>
            <p className="text-sm text-gray-500">
              {getMessage('noUnblockedSitesDescription')}
            </p>
          </div>
        </Card>
      )}

      {/* Blocked Sites List */}
      {blockedSites.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-success-600" />
            {getMessage('statusBlocked')} ({blockedSites.length})
          </h3>
          <div className="space-y-3">
            {blockedSites.map((site) => (
              <BlockedSiteItem key={site.domain} site={site} />
            ))}
          </div>
        </Card>
      )}

      {/* Unblocked Sites List */}
      {unblockedSites.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-block-500" />
            {getMessage('statusUnblocked')} ({unblockedSites.length})
          </h3>
          <div className="space-y-3">
            {unblockedSites.map((site) => (
              <UnblockedSiteItem
                key={site.domain}
                site={site}
                isPremium={isPremium}
                onReblock={onReblock}
                onStopTracking={onStopTracking}
              />
            ))}

            {/* Total time (Premium only) */}
            {isPremium && unblockedSites.length > 1 && (
              <div className="pt-4 border-t border-block-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {getMessage('totalTimeOnUnblockedSites')}
                  </span>
                  <span className="text-lg font-bold text-block-600">
                    {formatTime(totalTimeSpent)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Upgrade Prompt for Free Users */}
      {unblockedSites.length > 0 && !isPremium && (
        <Card>
          <UpgradePrompt
            variant="inline"
            features={[
              getMessage('upgradeFeatureViewTime'),
              getMessage('upgradeFeatureReblock'),
              getMessage('upgradeFeatureChart')
            ]}
          />
        </Card>
      )}
    </>
  );
}

function BlockedSiteItem({ site }: { site: TrackedSite }) {
  return (
    <div className="p-3 bg-success-50 rounded-lg border border-success-100">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success-500 rounded-full" />
            <span className="font-medium text-gray-900 truncate">
              {site.domain}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-700">
              {getMessage('statusBlocked')}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {getMessage('blockedSince')}: {formatRelativeTime(site.blockedAt)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-success-600">
            0{getMessage('time') === 'Time' ? 'm' : '\u5206'}
          </span>
          <p className="text-xs text-gray-500 inline-flex items-center gap-1">
            {getMessage('timeSaved')}
            <Info
              className="w-3 h-3 text-gray-400 cursor-help"
              title={getMessage('timeSavedTooltip')}
            />
          </p>
        </div>
      </div>
    </div>
  );
}

interface UnblockedSiteItemProps {
  site: TrackedSite;
  isPremium: boolean;
  onReblock: (domain: string) => void;
  onStopTracking: (domain: string) => void;
}

function UnblockedSiteItem({
  site,
  isPremium,
  onReblock,
  onStopTracking
}: UnblockedSiteItemProps) {
  return (
    <div className="p-4 bg-block-50 rounded-lg border border-block-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-block-500 rounded-full" />
            <span className="font-medium text-gray-900 truncate">
              {site.domain}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-block-100 text-block-700">
              {getMessage('statusUnblocked')}
            </span>
          </div>

          <p className="text-sm text-gray-500 mt-1">
            {getMessage('unblockedOn')}:{' '}
            {site.unblockedAt ? formatRelativeTime(site.unblockedAt) : '-'}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-gray-400" />
            {isPremium ? (
              <span className="text-sm font-medium text-block-600">
                {getMessage('timeSpentSinceUnblock')}:{' '}
                {formatTime(site.timeAfterUnblock)}
              </span>
            ) : (
              <span className="text-sm text-gray-400 flex items-center gap-1">
                {getMessage('timeSpentSinceUnblock')}:{' '}
                <span className="tracking-widest">******</span>
                <Lock className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isPremium && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReblock(site.domain)}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              {getMessage('reblock')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStopTracking(site.domain)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
          >
            <EyeOff className="w-4 h-4" />
            {getMessage('stopTracking')}
          </Button>
        </div>
      </div>
    </div>
  );
}
