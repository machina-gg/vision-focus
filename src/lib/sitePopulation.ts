import { isAllowedSite } from '~/lib/blockList';
import type { SiteKey, TrackedSites } from '~/types/site';

/**
 * 浪費時間の母集団（ブロックの規則を持つサイトと規則なしのサイト）のキーを返す
 * @param sites 登録
 * @returns 許可サイトを除いたサイトキー
 */
export function wasteSiteKeys(sites: TrackedSites): SiteKey[] {
  return Object.values(sites)
    .filter((site) => !isAllowedSite(site))
    .map((site) => site.domain);
}

/**
 * 許可サイトの時間の母集団（許可サイト。記録していないものも含む）のキーを返す
 * @param sites 登録
 * @returns 許可サイトのサイトキー
 */
export function allowedSiteKeys(sites: TrackedSites): SiteKey[] {
  return Object.values(sites)
    .filter(isAllowedSite)
    .map((site) => site.domain);
}
