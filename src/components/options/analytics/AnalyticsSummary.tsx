import React, { useMemo } from 'react';
import { Clock, RefreshCw, EyeOff, List } from 'lucide-react';

import { Card, Button } from '~/components/ui';
import {
  daysBetween,
  lastUnblockedOn,
  secondsSinceUnblock,
  totalSecondsSinceUnblock
} from '~/lib/activityStats';
import { normalizeSiteKey } from '~/lib/siteKey';
import { formatTime, toDateKey } from '~/lib/time';
import { getMessage } from '~/lib/i18n';
import type { ActivityLog, DateKey } from '~/types/activity';
import type { SiteKey } from '~/types/site';
import type { UnblockHistory, UnblockedSite } from '~/types/storage';

const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;

/** 日付キーから今日までの経過を言葉にする（日付はどちらもローカル日付） */
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

/** 一覧の 1 行（追跡中のサイト 1 つ） */
interface TrackedSiteRow {
  site: SiteKey;
  /** 解除履歴の行。ブロック中かどうか・ブロック開始日・操作の宛先はここから取る */
  entry: UnblockedSite | null;
  isBlocked: boolean;
  unblockedOn: DateKey | null;
  secondsSinceUnblock: number;
}

interface AnalyticsSummaryProps {
  /** 事実の表 */
  activity: ActivityLog;
  /** 母集団（追跡中のサイト）。一覧の行はこの集合 */
  sites: readonly SiteKey[];
  /** ブロック中かどうか・ブロック開始日・再ブロックと追跡停止の宛先 */
  unblockHistory: UnblockHistory;
  onReblock: (domain: string) => void;
  onStopTracking: (domain: string) => void;
}

export function AnalyticsSummary({
  activity,
  sites,
  unblockHistory,
  onReblock,
  onStopTracking
}: AnalyticsSummaryProps) {
  const today = toDateKey(new Date());

  const allTrackedSites = useMemo(() => {
    // 解除履歴のキーは登録時の表記のままなので、母集団と同じサイトキーに引き直して結ぶ
    const entries = new Map<SiteKey, UnblockedSite>();
    for (const entry of Object.values(unblockHistory.sites)) {
      const key = normalizeSiteKey(entry.domain);
      if (!entries.has(key)) entries.set(key, entry);
    }

    const rows: TrackedSiteRow[] = sites.map((site) => {
      const entry = entries.get(site) ?? null;
      return {
        site,
        entry,
        // 解除履歴に無いサイトはブロックリストか YouTube 機能から来ている（= ブロック中）
        isBlocked: entry === null || entry.status === 'blocked',
        unblockedOn: lastUnblockedOn(activity, site),
        secondsSinceUnblock: secondsSinceUnblock(activity, site, today)
      };
    });

    return rows.sort((a, b) => {
      // ブロック中を先に、その後解除済み
      if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
      // 同じステータス内では最近ブロックしたものを先に
      const byBlockedAt =
        (b.entry ? new Date(b.entry.blockedAt).getTime() : 0) -
        (a.entry ? new Date(a.entry.blockedAt).getTime() : 0);
      return byBlockedAt || a.site.localeCompare(b.site);
    });
  }, [activity, sites, unblockHistory.sites, today]);

  // 解除済みサイトのリスト（浪費時間表示用）
  const unblockedSites = useMemo(() => {
    return allTrackedSites.filter((row) => !row.isBlocked);
  }, [allTrackedSites]);

  const hasTrackedSites = allTrackedSites.length > 0;

  // 合計は各行と同じ関数で出す（行の値の和と一致させる）
  const totalWastedTime = useMemo(() => {
    return totalSecondsSinceUnblock(
      activity,
      unblockedSites.map((row) => row.site),
      today
    );
  }, [activity, unblockedSites, today]);

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
                key={row.site}
                row={row}
                today={today}
                onReblock={onReblock}
                onStopTracking={onStopTracking}
              />
            ))}
          </div>

          {/* 合計浪費時間（解除済みサイトが2つ以上の場合） */}
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

// 追跡中サイトのアイテム表示（ステータス + 浪費時間統合表示）
interface TrackedSiteItemProps {
  row: TrackedSiteRow;
  today: DateKey;
  onReblock: (domain: string) => void;
  onStopTracking: (domain: string) => void;
}

function TrackedSiteItem({
  row,
  today,
  onReblock,
  onStopTracking
}: TrackedSiteItemProps) {
  const { isBlocked, entry } = row;
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
              {row.site}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBgColor} ${statusTextColor}`}
            >
              {getMessage(isBlocked ? 'statusBlocked' : 'statusUnblocked')}
            </span>
          </div>
          {entry && (
            <p className="text-sm text-gray-500 mt-1">
              {getMessage('blockedSince')}:{' '}
              {formatRelativeDate(toDateKey(new Date(entry.blockedAt)), today)}
            </p>
          )}
          {!isBlocked && row.unblockedOn && (
            <p className="text-sm text-gray-500">
              {getMessage('unblockedOn')}:{' '}
              {formatRelativeDate(row.unblockedOn, today)}
            </p>
          )}

          {/* 浪費時間表示（解除済みサイトのみ） */}
          {!isBlocked && (
            <div className="mt-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-block-500" />
              <span className="text-sm font-bold text-block-600">
                {formatTime(row.secondsSinceUnblock)}
              </span>
            </div>
          )}
        </div>

        {/* アクションボタン（解除済みサイトのみ）。宛先は解除履歴に登録された表記 */}
        {!isBlocked && entry && (
          <div className="flex items-center gap-2">
            <Button
              data-testid="analytics-reblock-button"
              variant="secondary"
              size="sm"
              onClick={() => onReblock(entry.domain)}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              {getMessage('reblock')}
            </Button>
            <Button
              data-testid="analytics-stop-tracking-button"
              variant="ghost"
              size="sm"
              onClick={() => onStopTracking(entry.domain)}
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
