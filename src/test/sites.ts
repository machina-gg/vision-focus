import type { AllowedSite, BlockedSite } from '~/lib/blockList';
import type {
  BlockRule,
  SiteEntry,
  SiteKey,
  TrackedSites,
  YouTubeFeatures
} from '~/types/site';

const ADDED_AT = '2024-01-01T00:00:00.000Z';

/**
 * 規則なしの登録を作る
 * @param domain サイトキー
 * @param overrides 上書きするフィールド
 * @returns 登録
 */
export function trackedSite(
  domain: SiteKey,
  overrides: Partial<SiteEntry> = {}
): SiteEntry {
  return {
    domain,
    trackedAt: ADDED_AT,
    rule: null,
    youtube: null,
    ...overrides
  };
}

/**
 * ブロックの規則を持つ登録を作る（既定は有効な常時ブロック）
 * @param domain サイトキー
 * @param block 上書きするブロックの規則のフィールド
 * @param overrides 上書きする規則以外のフィールド
 * @returns ブロックの登録
 */
export function blockedSite(
  domain: SiteKey,
  block: Partial<Omit<BlockRule, 'kind'>> = {},
  overrides: Omit<Partial<SiteEntry>, 'rule'> = {}
): BlockedSite {
  return {
    ...trackedSite(domain, overrides),
    rule: {
      kind: 'block',
      enabled: true,
      addedAt: ADDED_AT,
      timeLimit: null,
      ...block
    }
  };
}

/**
 * 許可サイトの登録を作る
 * @param domain サイトキー
 * @param recordTime 滞在時間を記録するか（既定 false）
 * @param overrides 上書きする規則以外のフィールド
 * @returns 許可サイトの登録
 */
export function allowedSite(
  domain: SiteKey,
  recordTime = false,
  overrides: Omit<Partial<SiteEntry>, 'rule'> = {}
): AllowedSite {
  return {
    ...trackedSite(domain, overrides),
    rule: { kind: 'allow', recordTime }
  };
}

/**
 * YouTube の非表示機能を作る（既定はすべてオフ）
 * @param overrides 上書きするフィールド
 * @returns YouTube の非表示機能
 */
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

/**
 * 登録を保存値 sites の形にする
 * @param sites 登録
 * @returns サイトキーをキーにした登録
 */
export function sitesOf(...sites: SiteEntry[]): TrackedSites {
  return Object.fromEntries(sites.map((site) => [site.domain, site]));
}
