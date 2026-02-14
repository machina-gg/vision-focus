import React, { useMemo } from 'react';
import { Clock, Lock, RefreshCw, EyeOff, List } from 'lucide-react';

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
  // 全追跡サイト（ブロック中・解除済み両方）
  const allTrackedSites = useMemo(() => {
    const allSites = Object.values(unblockHistory.sites);
    return allSites.sort((a, b) => {
      // ブロック中を先に、その後解除済み
      if (a.status === 'blocked' && b.status !== 'blocked') return -1;
      if (a.status !== 'blocked' && b.status === 'blocked') return 1;
      // 同じステータス内では最近のものを先に
      return new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime();
    });
  }, [unblockHistory.sites]);

  // 解除済みサイトのリスト（浪費時間表示用）
  const unblockedSites = useMemo(() => {
    return allTrackedSites.filter((s) => s.status === 'unblocked');
  }, [allTrackedSites]);

  const hasTrackedSites = allTrackedSites.length > 0;

  // 合計浪費時間（解除済みサイトの閲覧時間の合計）
  const totalWastedTime = useMemo(() => {
    return unblockedSites.reduce((sum, site) => sum + site.timeAfterUnblock, 0);
  }, [unblockedSites]);

  return (
    <>
      {/* Empty State */}
      {!hasTrackedSites && (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <List className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {getMessage('noTrackedSites')}
            </h3>
            <p className="text-sm text-gray-500">
              {getMessage('noTrackedSitesDescription')}
            </p>
          </div>
        </Card>
      )}

      {/* 追跡中のサイト一覧（浪費時間統合） */}
      {hasTrackedSites && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <List className="w-4 h-4 text-gray-600" />
            {getMessage('trackedSitesList')} ({allTrackedSites.length})
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            {getMessage('trackedSitesListDescription')}
          </p>
          <div className="space-y-3">
            {allTrackedSites.map((site) => (
              <TrackedSiteItem
                key={site.domain}
                site={site}
                isPremium={isPremium}
                onReblock={onReblock}
                onStopTracking={onStopTracking}
              />
            ))}
          </div>

          {/* 合計浪費時間 (Premium only、解除済みサイトが2つ以上の場合) */}
          {isPremium && unblockedSites.length > 1 && (
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {getMessage('totalWastedTime')}
                </span>
                <span className="text-lg font-bold text-block-600">
                  {formatTime(totalWastedTime)}
                </span>
              </div>
            </div>
          )}
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

// 追跡中サイトのアイテム表示（ステータス + 浪費時間統合表示）
interface TrackedSiteItemProps {
  site: TrackedSite;
  isPremium: boolean;
  onReblock: (domain: string) => void;
  onStopTracking: (domain: string) => void;
}

function TrackedSiteItem({
  site,
  isPremium,
  onReblock,
  onStopTracking
}: TrackedSiteItemProps) {
  const isBlocked = site.status === 'blocked';
  const bgColor = isBlocked ? 'bg-success-50' : 'bg-block-50';
  const borderColor = isBlocked ? 'border-success-100' : 'border-block-100';
  const dotColor = isBlocked ? 'bg-success-500' : 'bg-block-500';
  const statusBgColor = isBlocked ? 'bg-success-100' : 'bg-gray-100';
  const statusTextColor = isBlocked ? 'text-success-700' : 'text-gray-700';

  return (
    <div className={`p-3 ${bgColor} rounded-lg border ${borderColor}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${dotColor} rounded-full`} />
            <span className="font-medium text-gray-900 truncate">
              {site.domain}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBgColor} ${statusTextColor}`}
            >
              {getMessage(isBlocked ? 'statusBlocked' : 'statusUnblocked')}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {getMessage('blockedSince')}: {formatRelativeTime(site.blockedAt)}
          </p>
          {!isBlocked && site.unblockedAt && (
            <p className="text-sm text-gray-500">
              {getMessage('unblockedOn')}:{' '}
              {formatRelativeTime(site.unblockedAt)}
            </p>
          )}

          {/* 浪費時間表示（解除済みサイトのみ） */}
          {!isBlocked && (
            <div className="mt-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-block-500" />
              {isPremium ? (
                <span className="text-sm font-bold text-block-600">
                  {formatTime(site.timeAfterUnblock)}
                </span>
              ) : (
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <span className="tracking-widest">******</span>
                  <Lock className="w-3 h-3" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* アクションボタン（解除済みサイトのみ） */}
        {!isBlocked && (
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
        )}
      </div>
    </div>
  );
}
