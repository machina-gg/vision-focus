import type { BlockedSite } from '~/lib/blockList';
import type {
  BlockRule,
  SiteKey,
  TrackedSite,
  TrackedSites,
  YouTubeFeatures
} from '~/types/site';

/**
 * テスト用の追跡中のサイトの組み立て。保存形（`TrackedSite`）の必須項目を
 * 各テストで書き直さないよう、ここに 1 箇所だけ置く
 */

const ADDED_AT = '2024-01-01T00:00:00.000Z';

/** 追跡だけのサイト（`block: null`） */
export function trackedSite(
  domain: SiteKey,
  overrides: Partial<TrackedSite> = {}
): TrackedSite {
  return {
    domain,
    trackedAt: ADDED_AT,
    block: null,
    youtube: null,
    ...overrides
  };
}

/** ブロック設定を持つサイト（既定は有効な常時ブロック） */
export function blockedSite(
  domain: SiteKey,
  block: Partial<BlockRule> = {},
  overrides: Omit<Partial<TrackedSite>, 'block'> = {}
): BlockedSite {
  return {
    ...trackedSite(domain, overrides),
    block: { enabled: true, addedAt: ADDED_AT, timeLimit: null, ...block }
  };
}

/** YouTube 機能（既定はすべて OFF） */
export function youtubeFeatures(
  overrides: Partial<YouTubeFeatures> = {}
): YouTubeFeatures {
  return {
    hideShorts: false,
    hideRecommendations: false,
    hideComments: false,
    hideHomeFeed: false,
    ...overrides
  };
}

/** サイトの並びを保存形（サイトキー → サイト）にする */
export function sitesOf(...sites: TrackedSite[]): TrackedSites {
  return Object.fromEntries(sites.map((site) => [site.domain, site]));
}
