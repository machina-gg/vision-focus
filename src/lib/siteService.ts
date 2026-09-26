// 書き込みはモジュール内の待ち行列で直列化する。background 以外から書き込み関数を呼ぶと直列化が効かず変更が消える

import { isValidDomain, parseDomainInput } from '~/lib/domain';
import { getSites, sitesItem } from '~/lib/storage';
import {
  findNestedSite,
  normalizeSiteKey,
  YOUTUBE_DOMAIN,
  type NestedSite
} from '~/lib/siteKey';
import type {
  BlockRule,
  SiteKey,
  TimeLimit,
  TrackedSite,
  TrackedSites,
  YouTubeFeatures
} from '~/types/site';

let tail: Promise<void> = Promise.resolve();

async function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const previous = tail;
  const run = (async () => {
    await previous;
    return await task();
  })();
  tail = (async () => {
    try {
      await run;
    } catch {
      // 後続の処理を止めないためだけに握る（失敗は run で呼び出し元へ返す）
    }
  })();
  return await run;
}

/** `change` は読み出した値を書き換えず、変更後の値を `next` で返す（変更が無ければ null） */
async function mutateSites<T>(
  change: (current: TrackedSites) => { next: TrackedSites | null; result: T }
): Promise<T> {
  return enqueue(async () => {
    const { next, result } = change(await getSites());
    if (next) await sitesItem.setValue(next);
    return result;
  });
}

export function trackedSiteKeys(sites: TrackedSites): SiteKey[] {
  return Object.keys(sites);
}

export async function getTrackedSiteKeys(): Promise<SiteKey[]> {
  return trackedSiteKeys(await getSites());
}

export type AddSiteRejection =
  | { reason: 'invalid' }
  | { reason: 'duplicate' }
  | { reason: 'nested'; nested: NestedSite };

/** 追加の結果。rejection が null なら site に追加したサイトキーが入る */
export interface AddSiteResult {
  site: SiteKey | null;
  rejection: AddSiteRejection | null;
}

function checkAddition(
  input: string,
  sites: TrackedSites,
  isDuplicate: (existing: TrackedSite) => boolean
): AddSiteResult {
  const site = normalizeSiteKey(parseDomainInput(input).domain);
  if (!isValidDomain(site))
    return { site: null, rejection: { reason: 'invalid' } };

  const existing = sites[site];
  if (existing) {
    return isDuplicate(existing)
      ? { site: null, rejection: { reason: 'duplicate' } }
      : { site, rejection: null };
  }

  const nested = findNestedSite(site, Object.keys(sites));
  if (nested) return { site: null, rejection: { reason: 'nested', nested } };
  return { site, rejection: null };
}

function newSite(site: SiteKey, now: Date): TrackedSite {
  return {
    domain: site,
    trackedAt: now.toISOString(),
    block: null,
    youtube: null
  };
}

function newBlockRule(now: Date): BlockRule {
  return { enabled: true, addedAt: now.toISOString(), timeLimit: null };
}

/** 入力をサイトキーにしてブロックリストに追加する（サイトが無ければ作る。既にブロック設定がある・入れ子になるなら拒否） */
export async function addBlock(
  input: string,
  now: Date
): Promise<AddSiteResult> {
  return mutateSites<AddSiteResult>((sites) => {
    const checked = checkAddition(
      input,
      sites,
      (existing) => existing.block !== null
    );
    if (checked.rejection !== null) return { next: null, result: checked };

    const { site } = checked;
    const current = sites[site] ?? newSite(site, now);
    return {
      next: { ...sites, [site]: { ...current, block: newBlockRule(now) } },
      result: checked
    };
  });
}

/** 入力をサイトキーにして追跡だけを始める（既に追跡中・入れ子になるなら拒否） */
export async function addTrackedSite(
  input: string,
  now: Date
): Promise<AddSiteResult> {
  return mutateSites<AddSiteResult>((sites) => {
    const checked = checkAddition(input, sites, () => true);
    if (checked.rejection !== null) return { next: null, result: checked };

    const { site } = checked;
    return {
      next: { ...sites, [site]: newSite(site, now) },
      result: checked
    };
  });
}

async function updateSite(
  site: SiteKey,
  change: (current: TrackedSite) => TrackedSite
): Promise<{ before: TrackedSite; after: TrackedSite } | null> {
  return mutateSites((sites) => {
    const before = sites[site];
    if (!before) return { next: null, result: null };
    const after = change(before);
    return { next: { ...sites, [site]: after }, result: { before, after } };
  });
}

/** ブロック設定を外し（追跡は続く）、外す前のブロック設定を返す（無ければ null） */
export async function removeBlock(site: SiteKey): Promise<BlockRule | null> {
  const changed = await updateSite(site, (current) => ({
    ...current,
    block: null
  }));
  return changed?.before.block ?? null;
}

/** ブロック設定の有効・無効を切り替え、切り替える前の設定を返す（ブロック設定が無ければ何もせず null） */
export async function setBlockEnabled(
  site: SiteKey,
  enabled: boolean
): Promise<BlockRule | null> {
  return mutateSites((sites) => {
    const current = sites[site];
    if (!current?.block) return { next: null, result: null };
    return {
      next: {
        ...sites,
        [site]: { ...current, block: { ...current.block, enabled } }
      },
      result: current.block
    };
  });
}

/** 時間制限を変える（null で外す）。ブロック設定を持たないサイトなら何もせず false */
export async function setTimeLimit(
  site: SiteKey,
  timeLimit: TimeLimit | null
): Promise<boolean> {
  return mutateSites((sites) => {
    const current = sites[site];
    if (!current?.block) return { next: null, result: false };
    return {
      next: {
        ...sites,
        [site]: { ...current, block: { ...current.block, timeLimit } }
      },
      result: true
    };
  });
}

/** youtube.com に書く値。youtube は非表示機能（null = 使わない）、block はアクセスブロック（null = 外す） */
export interface YouTubeSiteUpdate {
  youtube: YouTubeFeatures | null;
  block: Pick<BlockRule, 'enabled' | 'timeLimit'> | null;
}

/** youtube.com の非表示機能とアクセスブロックを書き（サイトが無ければ作る）、変更前のサイト（無ければ null）を返す */
export async function updateYouTubeSite(
  update: YouTubeSiteUpdate,
  now: Date
): Promise<TrackedSite | null> {
  return mutateSites((sites) => {
    const before = sites[YOUTUBE_DOMAIN] ?? null;
    const current = before ?? newSite(YOUTUBE_DOMAIN, now);
    const keepsNoBlock =
      update.block !== null && !update.block.enabled && !current.block;
    const block: BlockRule | null =
      update.block && !keepsNoBlock
        ? {
            addedAt: current.block?.addedAt ?? now.toISOString(),
            enabled: update.block.enabled,
            timeLimit: update.block.timeLimit
          }
        : null;
    return {
      next: {
        ...sites,
        [YOUTUBE_DOMAIN]: { ...current, youtube: update.youtube, block }
      },
      result: before
    };
  });
}

/** stopTracking の結果。in-use はブロック設定か YouTube 機能が残っていて止めなかったとき */
export type StopTrackingResult = 'stopped' | 'not-found' | 'in-use';

/** 追跡を止める（ブロック設定か YouTube 機能を持つサイトは止めない）。事実の行（activity）は消さないので呼び出し側で消す */
export async function stopTracking(site: SiteKey): Promise<StopTrackingResult> {
  return mutateSites((sites) => {
    const current = sites[site];
    if (!current) return { next: null, result: 'not-found' as const };
    if (current.block !== null || current.youtube !== null) {
      return { next: null, result: 'in-use' as const };
    }
    const rest = { ...sites };
    delete rest[site];
    return { next: rest, result: 'stopped' as const };
  });
}

/** importSites の結果。skipped は入れ子になるため取り込まなかったもの */
export interface ImportSitesResult {
  changed: SiteKey[];
  skipped: { input: string; nested: NestedSite }[];
}

/** 設定ファイルの追跡中のサイトを取り込む（既存の設定は上書きせず、無い設定だけを足す） */
export async function importSites(
  imported: readonly TrackedSite[],
  now: Date
): Promise<ImportSitesResult> {
  return mutateSites((sites) => {
    let next: TrackedSites = sites;
    const changed: SiteKey[] = [];
    const skipped: ImportSitesResult['skipped'] = [];
    for (const entry of imported) {
      const checked = checkAddition(entry.domain, next, () => false);
      if (checked.rejection !== null) {
        if (checked.rejection.reason === 'nested') {
          skipped.push({
            input: entry.domain,
            nested: checked.rejection.nested
          });
        }
        continue;
      }
      const { site } = checked;
      const current = next[site];
      const youtube = site === YOUTUBE_DOMAIN ? entry.youtube : null;
      const merged: TrackedSite = current
        ? {
            ...current,
            block: current.block ?? entry.block,
            youtube: current.youtube ?? youtube
          }
        : {
            domain: site,
            trackedAt: now.toISOString(),
            block: entry.block,
            youtube
          };
      if (
        current &&
        merged.block === current.block &&
        merged.youtube === current.youtube
      ) {
        continue;
      }
      next = { ...next, [site]: merged };
      changed.push(site);
    }
    return {
      next: changed.length > 0 ? next : null,
      result: { changed, skipped }
    };
  });
}
