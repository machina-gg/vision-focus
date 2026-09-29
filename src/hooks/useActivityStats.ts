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
import { wasteSiteKeys } from '~/lib/sitePopulation';
import { activityItem, sitesItem } from '~/lib/storage';
import { toDateKey } from '~/lib/time';
import type { ActivityLog, DateRange } from '~/types/activity';
import type { SiteKey } from '~/types/site';

import { useStorageItem } from './useStorageItem';

/** 活動統計の導出に使う入力（事実の表と、浪費時間の母集団・ホスト名の引き当てに使う全キー） */
export interface ActivitySources {
  /** 活動の事実の表 */
  activity: ActivityLog;
  /** 浪費時間の母集団（許可サイトを除いた追跡中のサイト）のキー */
  wasteSites: SiteKey[];
  /** 追跡中のサイトすべてのキー（ホスト名を一番具体的なサイトに引き当てるときに使う） */
  trackedSites: SiteKey[];
}

/** 今日の合計と、今日いちばんブロックされたサイトとその回数 */
export interface TodayStats extends TodaySummary {
  /** 今日いちばんブロックされたサイトの今日のブロック回数。該当なしなら 0 */
  topBlockedCount: number;
}

/**
 * 保持期間全体の日付範囲。daily-cleanup は「今日 - 保持日数」の日自身を残すので、今日を含めて保持日数 + 1 日
 * @param now 今日を決める現在時刻（ローカル日付で数える）
 * @returns 今日を最後の日とする保持期間全体の範囲
 */
export function retentionRange(now: Date): DateRange {
  return lastNDaysRange(now, MAX_HISTORY_DAYS_FALLBACK + 1);
}

/**
 * 今日（ローカル日付）の合計と、今日いちばんブロックされたサイト・その回数を返す
 * @param activity 活動の事実の表
 * @param sites 集計の対象にするサイトのキー（画面では浪費時間の母集団）
 * @param now 今日を決める現在時刻
 * @returns 今日の合計。ブロックが無ければ topBlockedCount は 0
 */
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
 * ホスト名が属する追跡中のサイトの、保持期間全体の合計を返す。どのサイトにも属さなければすべて 0
 * @param activity 活動の事実の表
 * @param sites 追跡中のサイトすべてのキー（母集団で絞ると引き当て先がずれるので絞らない）
 * @param hostname ブロックされたページのホスト名
 * @param now 保持期間を決める現在時刻
 * @returns 属するサイトの保持期間全体の合計（秒数・ブロック回数・解除回数）
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

/**
 * ブロックリストの項目ごとの、保持期間全体のブロック回数を返す（キーは項目の domain）
 * @param activity 活動の事実の表
 * @param blockRows ブロックリストの項目（domain はサイトキー）
 * @param now 保持期間を決める現在時刻
 * @returns 項目の domain → 保持期間全体のブロック回数
 */
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
 * 事実の表と追跡中のサイトを保存値から読み、変更に追従する
 * @returns 事実の表・浪費時間の母集団のキー・追跡中のサイトすべてのキー（読み込み前は空の既定値）
 */
export function useActivitySources(): ActivitySources {
  const activity = useStorageItem(activityItem);
  const sites = useStorageItem(sitesItem);
  const wasteSites = useMemo(() => wasteSiteKeys(sites), [sites]);
  const trackedSites = useMemo(() => trackedSiteKeys(sites), [sites]);
  return { activity, wasteSites, trackedSites };
}
