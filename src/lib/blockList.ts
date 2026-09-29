import {
  coveringSiteKeys,
  normalizeSiteKey,
  YOUTUBE_DOMAIN
} from '~/lib/siteKey';
import type {
  AllowRule,
  BlockRule,
  SiteEntry,
  SiteKey,
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

/** 「許可サイト」節の 1 行 */
export interface AllowedSiteRow {
  /** 許可サイトのサイトキー */
  domain: SiteKey;
  /** 滞在時間を記録するか */
  recordTime: boolean;
  /** 覆うブロックの登録のサイトキー（無ければ null） */
  exceptionOf: SiteKey | null;
}

function coveringBlockKey(
  hostname: string,
  sites: TrackedSites
): SiteKey | null {
  return (
    coveringSiteKeys(hostname, Object.keys(sites)).find((key) => {
      const site = sites[key];
      return site !== undefined && hasBlock(site);
    }) ?? null
  );
}

/**
 * 「許可サイト」節に並べる行をドメイン順で返す
 * @param sites 登録
 * @returns 許可サイトの行（覆うブロックがあればそのサイトキーを添える）
 */
export function allowedSiteRows(sites: TrackedSites): AllowedSiteRow[] {
  return Object.values(sites)
    .filter(isAllowedSite)
    .map((site) => ({
      domain: site.domain,
      recordTime: site.rule.recordTime,
      exceptionOf: coveringBlockKey(site.domain, sites)
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

/**
 * ブロックの登録の下にある許可サイトの件数
 * @param sites 登録
 * @param blockKey ブロックの登録のサイトキー
 * @returns blockKey の真のサブドメインにある許可サイトの件数
 */
export function allowedCountUnder(
  sites: TrackedSites,
  blockKey: SiteKey
): number {
  return Object.values(sites).filter(
    (site) => isAllowedSite(site) && site.domain.endsWith(`.${blockKey}`)
  ).length;
}

/**
 * ブロックされたホストを許可サイトにするときの候補（ブロックした登録そのものは許可サイトにできないので候補にしない）
 * @param hostname ブロックされたホスト名
 * @param sites 登録
 * @returns ホストを正規化したサイトキーが、覆うブロックの登録の真のサブドメインならそのキー。そうでなければ null
 */
export function allowCandidate(
  hostname: string,
  sites: TrackedSites
): SiteKey | null {
  const key = normalizeSiteKey(hostname);
  const blockKey = coveringBlockKey(key, sites);
  if (!blockKey || !key.endsWith(`.${blockKey}`)) return null;
  return key;
}
