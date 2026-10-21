import { daysBetween } from '~/lib/activityStats';
import { resolveSiteKey } from '~/lib/siteKey';
import { toDateKey } from '~/lib/time';
import type { TrackedSites } from '~/types/site';

/**
 * ホスト名が属するサイトをブロックしてから何日目か（ブロックした日が 1 日目。ブロックの規則が無ければ null）
 * @param hostname 数えるホスト名
 * @param sites 追跡中のサイト
 * @param now 基準の時刻
 * @returns ローカルの暦の日付で数えた日数（ブロックした日は 1、翌日は 2。属するサイトかブロックの規則が無ければ null）
 */
export function calculateBlockingDays(
  hostname: string,
  sites: TrackedSites,
  now: Date = new Date()
): number | null {
  const site = resolveSiteKey(hostname, Object.keys(sites));
  const rule = site === null ? null : sites[site]?.rule;
  if (rule?.kind !== 'block') return null;

  const addedOn = toDateKey(new Date(rule.addedAt));
  // 時計が戻って登録日が未来になっても 1 日目として扱う
  return Math.max(0, daysBetween(addedOn, toDateKey(now))) + 1;
}
