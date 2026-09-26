import { MS_PER_DAY } from '~/constants/intervals';
import { resolveSiteKey } from '~/lib/siteKey';
import type { TrackedSites } from '~/types/site';

// 遮られたホスト名が何日ブロックリストに載っているかを求める。
// ホスト名は判定・記録と同じ `resolveSiteKey` で追跡中のサイトに引き直す
// （www. / m. 付きのサブドメインも、ブロックを掛けたサイトの日数になる）
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
