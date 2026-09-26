/**
 * 追跡中のサイト（`sites`）から、画面が今受け取っている形を組み立てる（純粋関数）。
 *
 * ⚠ 一時的なモジュール。画面を `TrackedSite` で書き直すときに、画面側で直接読む形へ移して
 * このファイルごと削除する。ここに新しい形を足さない。
 */

import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import type { SiteKey, TimeLimit, TrackedSites } from '~/types/site';

/** ブロックリストの 1 行 */
export interface BlockListRow {
  /** 操作の宛先。サイトキーと同じ値 */
  id: SiteKey;
  domain: SiteKey;
  /** ブロックリストに入れた時刻（ISO8601） */
  createdAt: string;
  enabled: boolean;
  timeLimit: TimeLimit | null;
}

/**
 * 「ブロック中のサイト」一覧の行（ブロック設定を持つサイト。追加した順）。
 * youtube.com は YouTube の節が担当するので一覧に出さない
 */
export function selectBlockList(sites: TrackedSites): BlockListRow[] {
  const rows: BlockListRow[] = [];
  for (const site of Object.values(sites)) {
    if (!site.block || site.domain === YOUTUBE_DOMAIN) continue;
    rows.push({
      id: site.domain,
      domain: site.domain,
      createdAt: site.block.addedAt,
      enabled: site.block.enabled,
      timeLimit: site.block.timeLimit
    });
  }
  return rows.sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.domain.localeCompare(b.domain)
  );
}

/** YouTube の節が扱う値（非表示機能とアクセスブロックをまとめた形） */
export interface YouTubeSectionValue {
  enabled: boolean;
  blockAccess: boolean;
  hideShorts: boolean;
  hideRecommendations: boolean;
  hideComments: boolean;
  hideHomeFeed: boolean;
  timeLimit: TimeLimit | null;
}

/**
 * youtube.com のサイトから YouTube の節の値を作る。
 * ブロックリストの入力から youtube.com を足した場合も、節ではアクセスブロックが有効に見える
 * （機能全体を有効として表示しないと、非表示の切り替えでアクセスブロックが外れてしまう）
 */
export function selectYouTubeSection(sites: TrackedSites): YouTubeSectionValue {
  const site = sites[YOUTUBE_DOMAIN];
  const features = site?.youtube ?? null;
  const blockAccess = site?.block?.enabled === true;
  return {
    enabled: features !== null || blockAccess,
    blockAccess,
    hideShorts: features?.hideShorts ?? false,
    hideRecommendations: features?.hideRecommendations ?? false,
    hideComments: features?.hideComments ?? false,
    hideHomeFeed: features?.hideHomeFeed ?? false,
    timeLimit: site?.block?.timeLimit ?? null
  };
}

/** 追跡中のサイト一覧（分析タブ）の行 */
export interface TrackedSiteListRow {
  domain: SiteKey;
  /** ブロックが有効か（`block.enabled`） */
  isBlocked: boolean;
  /** ブロックリストに入れた時刻（ISO8601）。ブロック設定が無ければ null */
  blockedAt: string | null;
  /** 再ブロックできるか（ブロック設定を持たない） */
  canReblock: boolean;
  /** 追跡を止められるか（ブロック設定も YouTube 機能も持たない） */
  canStopTracking: boolean;
}

/** 追跡中のサイト一覧の行を作る（並び順は画面が決める） */
export function selectTrackedSiteRows(
  sites: TrackedSites
): TrackedSiteListRow[] {
  return Object.values(sites).map((site) => ({
    domain: site.domain,
    isBlocked: site.block?.enabled === true,
    blockedAt: site.block?.addedAt ?? null,
    canReblock: site.block === null,
    canStopTracking: site.block === null && site.youtube === null
  }));
}
