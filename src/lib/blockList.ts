import { coveringSiteKeys, YOUTUBE_DOMAIN } from '~/lib/siteKey';
import type {
  AllowRule,
  BlockRule,
  SiteEntry,
  TrackedSites
} from '~/types/site';

/** ブロックの規則を持つ登録 */
export type BlockedSite = SiteEntry & {
  /** ブロックの規則 */
  rule: BlockRule;
};

/** 許可サイトの登録 */
export type AllowedSite = SiteEntry & {
  /** 許可の規則 */
  rule: AllowRule;
};

/**
 * 登録がブロックの規則を持つか（型を BlockedSite に絞る）
 * @param site 登録
 * @returns ブロックの規則を持てば true
 */
export function hasBlock(site: SiteEntry): site is BlockedSite {
  return site.rule?.kind === 'block';
}

/**
 * 登録が許可サイトか（型を AllowedSite に絞る）
 * @param site 登録
 * @returns 許可の規則を持てば true
 */
export function isAllowedSite(site: SiteEntry): site is AllowedSite {
  return site.rule?.kind === 'allow';
}

/**
 * ホスト名を覆う登録に許可サイトがあるか（あればブロックも YouTube の非表示機能も当てない）
 * @param hostname 判定するホスト名
 * @param sites 登録
 * @returns 許可サイトに当たれば true
 */
export function isAllowedHost(hostname: string, sites: TrackedSites): boolean {
  return coveringSiteKeys(hostname, Object.keys(sites)).some((key) => {
    const site = sites[key];
    return site !== undefined && isAllowedSite(site);
  });
}

/**
 * 「ブロック中のサイト」一覧に並べるサイトを追加した順で返す（youtube.com は YouTube 専用の節が扱うので除く）
 * @param sites 登録
 * @returns ブロックの規則を持つサイト（ブロックに追加した順、同時刻はドメイン順）
 */
export function blockListSites(sites: TrackedSites): BlockedSite[] {
  return Object.values(sites)
    .filter(hasBlock)
    .filter((site) => site.domain !== YOUTUBE_DOMAIN)
    .sort(
      (a, b) =>
        a.rule.addedAt.localeCompare(b.rule.addedAt) ||
        a.domain.localeCompare(b.domain)
    );
}
