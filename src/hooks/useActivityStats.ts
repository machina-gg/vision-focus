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

/** 画面が導出に使う入力（事実と、その母集団である追跡中のサイト） */
export interface ActivitySources {
  activity: ActivityLog;
  sites: SiteKey[];
}

export interface TodayStats extends TodaySummary {
  /** 今日いちばんブロックされたサイトの今日のブロック回数（該当なしなら 0） */
  topBlockedCount: number;
}

/**
 * 保持期間全体。daily-cleanup は「今日 - 保持日数」の日より前の行を消し、
 * その日自身は残すので、今日を含めて保持日数 + 1 日になる
 */
export function retentionRange(now: Date): DateRange {
  return lastNDaysRange(now, MAX_HISTORY_DAYS_FALLBACK + 1);
}

/** 今日の合計と、今日いちばんブロックされたサイト・その回数（日付はローカル日付） */
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

/**
 * ブロックされたホスト名が属するサイトの、保持期間全体の合計。
 * ホスト名（www. / m. 付きなど）は書き手と同じ規則で追跡中のサイトに引き直す。
 * どのサイトにも属さなければすべて 0
 */
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

/** ブロックリストの項目ごとの、保持期間全体のブロック回数（キーは項目の domain = サイトキー） */
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

/**
 * 事実（`activity`）と追跡中のサイトを保存値から読む。
 * どちらも `watch` で追従するので、background が書いた出来事はそのまま画面に反映される
 */
export function useActivitySources(): ActivitySources {
  const [activity] = useStorageItem(activityItem);
  const [trackedSites] = useStorageItem(sitesItem);
  const sites = useMemo(() => trackedSiteKeys(trackedSites), [trackedSites]);
  return { activity, sites };
}
