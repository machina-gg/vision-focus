import { MS_PER_DAY } from '~/constants/intervals';
import { resolveSiteKey } from '~/lib/siteKey';
import type { TrackedSites } from '~/types/site';

/**
 * ホスト名が属するサイトをブロックリストに入れてからの日数（1 日未満も 1。ブロック設定が無ければ null）
 * @param hostname 数えるホスト名
 * @param sites 追跡中のサイト
 * @param now 基準の時刻
 * @returns ブロックに追加してからの経過日数（切り捨てで最小 1。属するサイトかブロック設定が無ければ null）
 */
export function calculateBlockingDays(
  hostname: string,
  sites: TrackedSites,
  now: Date = new Date()
): number | null {
  const site = resolveSiteKey(hostname, Object.keys(sites));
  const block = site === null ? null : sites[site].block;
  if (!block) return null;

  const diffTime = now.getTime() - new Date(block.addedAt).getTime();
  const diffDays = Math.floor(diffTime / MS_PER_DAY);

  return Math.max(1, diffDays);
}
