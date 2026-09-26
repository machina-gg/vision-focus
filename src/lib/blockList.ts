import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import type { BlockRule, TrackedSite, TrackedSites } from '~/types/site';

/** ブロック設定を持つ追跡中のサイト */
export type BlockedSite = TrackedSite & { block: BlockRule };

export function hasBlock(site: TrackedSite): site is BlockedSite {
  return site.block !== null;
}

/** 「ブロック中のサイト」一覧に並べるサイトを追加した順で返す（youtube.com は YouTube 専用の節が扱うので除く） */
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
