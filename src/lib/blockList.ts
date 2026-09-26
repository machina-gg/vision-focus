import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import type { BlockRule, TrackedSite, TrackedSites } from '~/types/site';

/** ブロック設定を持つ追跡中のサイト */
export type BlockedSite = TrackedSite & { block: BlockRule };

/** ブロック設定を持つか（型をブロック設定ありに絞る） */
export function hasBlock(site: TrackedSite): site is BlockedSite {
  return site.block !== null;
}

/**
 * 「ブロック中のサイト」一覧（ブロックリストタブ・新しいタブ・ブロックリスト CSV）に並べるサイト。
 * ブロック設定を持つサイトを追加した順（同時刻はサイトキー順）に並べる。
 *
 * youtube.com は除く。youtube.com のアクセスブロックと時間制限は YouTube 専用の節だけが扱う
 * （一覧にも出すと同じ設定を 2 箇所から変えられ、節の「機能全体の有効・無効」の表示と食い違う）。
 * データ上は普通の追跡中のサイトなので、分析の母集団や追跡中サイト一覧からは除かない
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
