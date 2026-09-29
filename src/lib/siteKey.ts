import type { SiteKey, SiteRule, TrackedSites } from '~/types/site';

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
 * ホスト名を覆うサイトキー（キーと一致するか .キー で終わるもの）をキーの長い順に返す
 * @param hostname 引き当てるホスト名
 * @param sites 候補のサイトキー
 * @returns 覆うサイトキー（最も具体的なものが先頭。無ければ空）
 */
export function coveringSiteKeys(
  hostname: string,
  sites: readonly SiteKey[]
): SiteKey[] {
  const host = hostname.trim().toLowerCase();
  if (!host) return [];

  return sites
    .filter((key) => key && (host === key || host.endsWith(`.${key}`)))
    .sort((a, b) => b.length - a.length);
}

/**
 * ホスト名が属するサイトキー（覆うもののうち最長。無ければ null）
 * @param hostname 引き当てるホスト名
 * @param sites 候補のサイトキー
 * @returns 最も具体的に一致するサイトキー
 */
export function resolveSiteKey(
  hostname: string,
  sites: readonly SiteKey[]
): SiteKey | null {
  return coveringSiteKeys(hostname, sites)[0] ?? null;
}

/** 入れ子になる既存のサイト。relation は既存のサイトから見た関係 */
export interface NestedSite {
  /** 入れ子になる既存のサイトキー */
  site: SiteKey;
  /** ancestor = 既存のサイトが追加するキーを含む / descendant = 既存のサイトが追加するキーに含まれる */
  relation: 'ancestor' | 'descendant';
}

/**
 * key を kind の規則で登録すると許されない入れ子になる既存のサイトを返す（祖先・子孫の組を許すのは子孫が許可サイトのときだけ。同じキーは数えない）
 * @param key 登録しようとしているサイトキー
 * @param kind 登録する規則の種類（null = 規則なし）
 * @param sites 既存の登録
 * @returns 最初に見つかった許されない入れ子の相手とその関係（無ければ null）
 */
export function findNestingConflict(
  key: SiteKey,
  kind: SiteRule['kind'] | null,
  sites: TrackedSites
): NestedSite | null {
  for (const [site, entry] of Object.entries(sites)) {
    if (!site || site === key) continue;
    if (key.endsWith(`.${site}`) && kind !== 'allow') {
      return { site, relation: 'ancestor' };
    }
    if (site.endsWith(`.${key}`) && entry.rule?.kind !== 'allow') {
      return { site, relation: 'descendant' };
    }
  }
  return null;
}
