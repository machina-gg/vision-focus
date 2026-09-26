import { MS_PER_DAY } from '~/constants/intervals';
import { resolveSiteKey } from '~/lib/siteKey';
import type { TrackedSites } from '~/types/site';

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
