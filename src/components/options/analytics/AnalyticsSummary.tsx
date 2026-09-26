import React, { useMemo } from 'react';
import { Clock, RefreshCw, EyeOff, List } from 'lucide-react';

import { Card, Button } from '~/components/ui';
import {
  daysBetween,
  lastUnblockedOn,
  secondsSinceUnblock,
  totalSecondsSinceUnblock
} from '~/lib/activityStats';
import { formatTime, toDateKey } from '~/lib/time';
import { getMessage } from '~/lib/i18n';
import type { ActivityLog, DateKey } from '~/types/activity';
import type { TrackedSite, TrackedSites } from '~/types/site';

const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;

function formatRelativeDate(date: DateKey, today: DateKey): string {
  const diffDays = daysBetween(date, today);

  if (diffDays <= 0) {
    return getMessage('today');
  } else if (diffDays === 1) {
    return getMessage('yesterday');
  } else if (diffDays < DAYS_PER_WEEK) {
    return getMessage('daysAgo', String(diffDays));
  } else if (diffDays < DAYS_PER_MONTH) {
    const weeks = Math.floor(diffDays / DAYS_PER_WEEK);
    return getMessage('weeksAgo', String(weeks));
  } else {
    const months = Math.floor(diffDays / DAYS_PER_MONTH);
    return getMessage('monthsAgo', String(months));
  }
}

type TrackedSiteStatus = 'blocked' | 'disabled' | 'tracking';

const STATUS_ORDER: Record<TrackedSiteStatus, number> = {
  blocked: 0,
  disabled: 1,
  tracking: 2
};

const STATUS_LABEL_KEY: Record<TrackedSiteStatus, string> = {
  blocked: 'statusBlocked',
  disabled: 'statusBlockDisabled',
  tracking: 'statusUnblocked'
};

function statusOf(site: TrackedSite): TrackedSiteStatus {
  if (site.block === null) return 'tracking';
  return site.block.enabled ? 'blocked' : 'disabled';
}

interface TrackedSiteRow {
  site: TrackedSite;
  status: TrackedSiteStatus;
  unblockedOn: DateKey | null;
  secondsSinceUnblock: number;
}

/** AnalyticsSummary に渡す集計元とサイトごとの操作 */
interface AnalyticsSummaryProps {
  /** 日別・サイト別の閲覧時間と解除の記録 */
  activity: ActivityLog;
  /** 登録済みのサイト（計測・ブロックの状態を含む） */
  trackedSites: TrackedSites;
  /** 行のサイトをブロックに戻すときに、そのサイトを受け取る */
  onReblock: (site: TrackedSite) => void;
  /** 行のサイトの計測をやめるときに、そのサイトを受け取る */
  onStopTracking: (site: TrackedSite) => void;
}

/**
 * 計測中のサイトを状態（ブロック中・無効・計測のみ）の順に並べ、解除してからの時間とその合計を表示する
 * @param props 集計元とサイトごとの操作（各フィールドは AnalyticsSummaryProps）
 * @returns 計測中のサイトの一覧。サイトが無ければその案内
 */
export function AnalyticsSummary({
  activity,
  trackedSites,
  onReblock,
  onStopTracking
}: AnalyticsSummaryProps) {
  const today = toDateKey(new Date());

  const allTrackedSites = useMemo(() => {
    const rows: TrackedSiteRow[] = Object.values(trackedSites).map((site) => ({
      site,
      status: statusOf(site),
      unblockedOn: lastUnblockedOn(activity, site.domain),
      secondsSinceUnblock: secondsSinceUnblock(activity, site.domain, today)
    }));

    return rows.sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      const byAddedAt = (b.site.block?.addedAt ?? '').localeCompare(
        a.site.block?.addedAt ?? ''
      );
      return byAddedAt || a.site.domain.localeCompare(b.site.domain);
    });
  }, [activity, trackedSites, today]);

  const unblockedSites = useMemo(() => {
    return allTrackedSites.filter((row) => row.status !== 'blocked');
  }, [allTrackedSites]);

  const hasTrackedSites = allTrackedSites.length > 0;

  const totalWastedTime = useMemo(() => {
    return totalSecondsSinceUnblock(
      activity,
      unblockedSites.map((row) => row.site.domain),
      today
    );
  }, [activity, unblockedSites, today]);

  return (
    <>
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

      {hasTrackedSites && (
        <Card>
          <h3
            className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"
            data-testid="analytics-tracked-sites-heading"
          >
            <List className="w-4 h-4 text-gray-600" />
            {getMessage('trackedSitesList')} ({allTrackedSites.length})
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            {getMessage('trackedSitesListDescription')}
          </p>
          <div className="space-y-3">
            {allTrackedSites.map((row) => (
              <TrackedSiteItem
                key={row.site.domain}
                row={row}
                today={today}
                onReblock={onReblock}
                onStopTracking={onStopTracking}
              />
            ))}
          </div>

          {unblockedSites.length > 1 && (
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
    </>
  );
}

interface TrackedSiteItemProps {
  row: TrackedSiteRow;
  today: DateKey;
  onReblock: (site: TrackedSite) => void;
  onStopTracking: (site: TrackedSite) => void;
}

function TrackedSiteItem({
  row,
  today,
  onReblock,
  onStopTracking
}: TrackedSiteItemProps) {
  const { site, status } = row;
  const isBlocked = status === 'blocked';
  const canStopTracking = site.block === null && site.youtube === null;
  const bgColor = isBlocked ? 'bg-success-50' : 'bg-block-50';
  const borderColor = isBlocked ? 'border-success-100' : 'border-block-100';
  const dotColor = isBlocked ? 'bg-success-500' : 'bg-block-500';
  const statusBgColor = isBlocked ? 'bg-success-100' : 'bg-gray-100';
  const statusTextColor = isBlocked ? 'text-success-700' : 'text-gray-700';

  return (
    <div
      className={`p-3 ${bgColor} rounded-lg border ${borderColor}`}
      data-testid="analytics-tracked-site"
      data-status={status}
    >
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
              {getMessage(STATUS_LABEL_KEY[status])}
            </span>
          </div>
          {site.block && (
            <p className="text-sm text-gray-500 mt-1">
              {getMessage('blockedSince')}:{' '}
              {formatRelativeDate(
                toDateKey(new Date(site.block.addedAt)),
                today
              )}
            </p>
          )}
          {!isBlocked && row.unblockedOn && (
            <p className="text-sm text-gray-500">
              {getMessage('unblockedOn')}:{' '}
              {formatRelativeDate(row.unblockedOn, today)}
            </p>
          )}

          {!isBlocked && (
            <div className="mt-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-block-500" />
              <span className="text-sm font-bold text-block-600">
                {formatTime(row.secondsSinceUnblock)}
              </span>
            </div>
          )}
        </div>

        {!isBlocked && (
          <div className="flex items-center gap-2">
            <Button
              data-testid="analytics-reblock-button"
              variant="secondary"
              size="sm"
              onClick={() => onReblock(site)}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              {getMessage('reblock')}
            </Button>
            {canStopTracking && (
              <Button
                data-testid="analytics-stop-tracking-button"
                variant="ghost"
                size="sm"
                onClick={() => onStopTracking(site)}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
              >
                <EyeOff className="w-4 h-4" />
                {getMessage('stopTracking')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
