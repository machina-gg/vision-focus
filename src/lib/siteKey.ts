import type { SiteKey } from '~/types/site';

/** YouTube のサイトキー。YouTube 固有の非表示機能はこのキーのサイトだけが持てる */
export const YOUTUBE_DOMAIN: SiteKey = 'youtube.com';

const WILDCARD_PREFIX = '*.';
const WWW_PREFIX = 'www.';

/**
 * 入力（ドメイン・ワイルドカード表記）をサイトキーにする。
 * `*.example.com` と `example.com` は照合結果が同じなので同じキーにし、
 * `www.` を除くのは www 付きとなしを別サイトとして数えないため
 */
export function normalizeSiteKey(input: string): SiteKey {
  let key = input.trim().toLowerCase();
  if (key.startsWith(WILDCARD_PREFIX)) {
    key = key.slice(WILDCARD_PREFIX.length);
  }
  if (key.startsWith(WWW_PREFIX)) {
    key = key.slice(WWW_PREFIX.length);
  }
  return key;
}

/**
 * ホスト名が属するサイトキーを返す。どれにも属さなければ null。
 * 一致は「ホスト名がキーと一致するか `.キー` で終わるか」（`||キー` と同じ範囲）。
 * サイト同士は入れ子にしない前提で一致は高々 1 つだが、
 * 崩れていても結果が登録順に左右されないよう最も長いキーを返す
 */
export function resolveSiteKey(
  hostname: string,
  sites: readonly SiteKey[]
): SiteKey | null {
  const host = hostname.trim().toLowerCase();
  if (!host) return null;

  let best: SiteKey | null = null;
  for (const key of sites) {
    // 空のキーは `.` で終わる判定がすべてのホストに一致しかねないので読み飛ばす
    if (!key) continue;
    const matches = host === key || host.endsWith(`.${key}`);
    if (matches && (best === null || key.length > best.length)) {
      best = key;
    }
  }
  return best;
}

/** 入れ子になる既存のサイト。`relation` は既存のサイトから見た関係 */
export interface NestedSite {
  site: SiteKey;
  relation: 'ancestor' | 'descendant';
}

/**
 * `key` を追加すると入れ子になる既存のサイトを返す（無ければ null。同じキーは入れ子に数えない）。
 * サイト同士を入れ子にすると 1 つのホスト名が 2 つのサイトに属し、滞在時間・時間制限の
 * 使用量が片方にしか数えられない（子を登録すれば親の時間制限を回避できる）ため、追加時に拒否する
 */
export function findNestedSite(
  key: SiteKey,
  sites: readonly SiteKey[]
): NestedSite | null {
  for (const site of sites) {
    if (!site || site === key) continue;
    if (key.endsWith(`.${site}`)) return { site, relation: 'ancestor' };
    if (site.endsWith(`.${key}`)) return { site, relation: 'descendant' };
  }
  return null;
}
