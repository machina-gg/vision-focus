import { useMemo } from 'react';

import { MAX_HISTORY_DAYS_FALLBACK } from '~/constants/intervals';
import {
  lastNDaysRange,
  siteTotals,
  todaySummary,
  type ActivityTotals,
  type TodaySummary
} from '~/lib/activityStats';
import { resolveSiteKey } from '~/lib/siteKey';
import { trackedSiteKeys } from '~/lib/siteService';
import { activityItem, sitesItem } from '~/lib/storage';
import { toDateKey } from '~/lib/time';
import type { ActivityLog, DateRange } from '~/types/activity';
import type { SiteKey } from '~/types/site';

import { useStorageItem } from './useStorageItem';

export interface ActivitySources {
  activity: ActivityLog;
  sites: SiteKey[];
}

export interface TodayStats extends TodaySummary {
  topBlockedCount: number;
}

// daily-cleanup は「今日 - 保持日数」の日自身を残すので、今日を含めて保持日数 + 1 日
export function retentionRange(now: Date): DateRange {
  return lastNDaysRange(now, MAX_HISTORY_DAYS_FALLBACK + 1);
}

export function todayStats(
  activity: ActivityLog,
  sites: readonly SiteKey[],
  now: Date
): TodayStats {
  const today = toDateKey(now);
  const summary = todaySummary(activity, sites, today);
  const topBlockedCount =
    summary.topBlockedSite === null
      ? 0
      : siteTotals(activity, summary.topBlockedSite, { from: today, to: today })
          .blocks;
  return { ...summary, topBlockedCount };
}

export function blockedHostTotals(
  activity: ActivityLog,
  sites: readonly SiteKey[],
  hostname: string,
  now: Date
): ActivityTotals {
  const site = resolveSiteKey(hostname, sites);
  if (site === null) return { seconds: 0, blocks: 0, unblocks: 0 };
  return siteTotals(activity, site, retentionRange(now));
}

export function blockCountsByDomain(
  activity: ActivityLog,
  blockRows: readonly { domain: SiteKey }[],
  now: Date
): Record<string, number> {
  const range = retentionRange(now);
  return Object.fromEntries(
    blockRows.map((item) => [
      item.domain,
      siteTotals(activity, item.domain, range).blocks
    ])
  );
}

export function useActivitySources(): ActivitySources {
  const [activity] = useStorageItem(activityItem);
  const [trackedSites] = useStorageItem(sitesItem);
  const sites = useMemo(() => trackedSiteKeys(trackedSites), [trackedSites]);
  return { activity, sites };
}
