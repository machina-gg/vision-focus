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

/** 活動統計の導出に使う入力（事実の表と、その母集団である追跡中のサイト） */
export interface ActivitySources {
  activity: ActivityLog;
  sites: SiteKey[];
}

export interface TodayStats extends TodaySummary {
  /** 今日いちばんブロックされたサイトの今日のブロック回数。該当なしなら 0 */
  topBlockedCount: number;
}

/** 保持期間全体の日付範囲。daily-cleanup は「今日 - 保持日数」の日自身を残すので、今日を含めて保持日数 + 1 日 */
export function retentionRange(now: Date): DateRange {
  return lastNDaysRange(now, MAX_HISTORY_DAYS_FALLBACK + 1);
}

/** 今日（ローカル日付）の合計と、今日いちばんブロックされたサイト・その回数を返す */
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

/** ホスト名が属する追跡中のサイトの、保持期間全体の合計を返す。どのサイトにも属さなければすべて 0 */
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

/** ブロックリストの項目ごとの、保持期間全体のブロック回数を返す（キーは項目の domain） */
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

/** 事実の表と追跡中のサイトを保存値から読み、変更に追従する */
export function useActivitySources(): ActivitySources {
  const [activity] = useStorageItem(activityItem);
  const [trackedSites] = useStorageItem(sitesItem);
  const sites = useMemo(() => trackedSiteKeys(trackedSites), [trackedSites]);
  return { activity, sites };
}
