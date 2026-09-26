import type { SiteKey } from '~/types/site';

/** YouTube のサイトキー。YouTube 固有の非表示機能はこのキーのサイトだけが持てる */
export const YOUTUBE_DOMAIN: SiteKey = 'youtube.com';

const WILDCARD_PREFIX = '*.';
const WWW_PREFIX = 'www.';

/**
 * 入力を照合用のサイトキーにする（小文字にし、先頭の *. と www. を外す）
 * @param input ドメインの入力
 * @returns サイトキー
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
 * ホスト名が属するサイトキー（キーと一致するか .キー で終わるもののうち最長。無ければ null）
 * @param hostname 引き当てるホスト名
 * @param sites 候補のサイトキー
 * @returns 最も具体的に一致するサイトキー
 */
export function resolveSiteKey(
  hostname: string,
  sites: readonly SiteKey[]
): SiteKey | null {
  const host = hostname.trim().toLowerCase();
  if (!host) return null;

  let best: SiteKey | null = null;
  for (const key of sites) {
    if (!key) continue;
    const matches = host === key || host.endsWith(`.${key}`);
    if (matches && (best === null || key.length > best.length)) {
      best = key;
    }
  }
  return best;
}

/** 入れ子になる既存のサイト。relation は既存のサイトから見た関係 */
export interface NestedSite {
  /** 入れ子になる既存のサイトキー */
  site: SiteKey;
  /** ancestor = 既存のサイトが追加するキーを含む / descendant = 既存のサイトが追加するキーに含まれる */
  relation: 'ancestor' | 'descendant';
}

/**
 * key を追加すると入れ子になる既存のサイトを返す（同じキーは数えない。無ければ null）
 * @param key 追加しようとしているサイトキー
 * @param sites 既存のサイトキー
 * @returns 最初に見つかった入れ子になるサイトとその関係
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
