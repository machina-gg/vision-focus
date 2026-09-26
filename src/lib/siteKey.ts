import type { SiteKey } from '~/types/site';

export const YOUTUBE_DOMAIN: SiteKey = 'youtube.com';

const WILDCARD_PREFIX = '*.';
const WWW_PREFIX = 'www.';

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

export interface NestedSite {
  site: SiteKey;
  relation: 'ancestor' | 'descendant';
}

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
