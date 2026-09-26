import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import type { BlockRule, TrackedSite, TrackedSites } from '~/types/site';

export type BlockedSite = TrackedSite & { block: BlockRule };

export function hasBlock(site: TrackedSite): site is BlockedSite {
  return site.block !== null;
}

export function blockListSites(sites: TrackedSites): BlockedSite[] {
  return Object.values(sites)
    .filter(hasBlock)
    .filter((site) => site.domain !== YOUTUBE_DOMAIN)
    .sort(
      (a, b) =>
        a.block.addedAt.localeCompare(b.block.addedAt) ||
        a.domain.localeCompare(b.domain)
    );
}
