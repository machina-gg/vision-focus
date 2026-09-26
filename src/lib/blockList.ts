import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import type { BlockRule, TrackedSite, TrackedSites } from '~/types/site';

/** ブロック設定を持つ追跡中のサイト */
export type BlockedSite = TrackedSite & {
  /** ブロック設定（null でない） */
  block: BlockRule;
};

/**
 * 追跡中のサイトがブロック設定を持つか（型を BlockedSite に絞る）
 * @param site 追跡中のサイト
 * @returns ブロック設定があれば true
 */
export function hasBlock(site: TrackedSite): site is BlockedSite {
  return site.block !== null;
}

/**
 * 「ブロック中のサイト」一覧に並べるサイトを追加した順で返す（youtube.com は YouTube 専用の節が扱うので除く）
 * @param sites 追跡中のサイト
 * @returns ブロック設定を持つサイト（ブロックに追加した順、同時刻はドメイン順）
 */
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
