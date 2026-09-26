import type { SiteKey } from '~/types/site';

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
