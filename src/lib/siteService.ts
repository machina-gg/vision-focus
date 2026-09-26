/**
 * SiteService - 追跡中のサイト（`sites`）の読み書き
 *
 * 追跡中のサイトは分析の母集団で、サイトごとの設定（ブロック・時間制限・YouTube 機能）の
 * 置き場でもある。事実の表（`activity`）に記録してよいサイトの集合もここのキーで決まる。
 *
 * 書き込みはすべて 1 本の待ち行列で直列化する。「読む → 変える → 書く」の間に
 * 別の書き込みが割り込むと、先に書いた側の変更が後から書いた側に上書きされて消えるため。
 *
 * ⚠ 待ち行列はこのモジュールの中にしかないので、background（Service Worker）以外から
 * 書き込み関数を呼ぶと直列化が効かない。画面は background へメッセージで依頼する。
 */

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

/** 直前に積まれた処理の完了を表す。失敗しても後続を止めないよう、ここは常に解決する */
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
      // 失敗は呼び出し元へ run で返す。ここで握るのは後続の処理を止めないためだけ
    }
  })();
  return await run;
}

/**
 * 追跡中のサイトを読んで変更し、変更があれば書く（待ち行列の中で行う）。
 * `change` は読み出した値を書き換えず、変更後の値を `next` で返す（変更が無ければ null）
 */
async function mutateSites<T>(
  change: (current: TrackedSites) => { next: TrackedSites | null; result: T }
): Promise<T> {
  return enqueue(async () => {
    const { next, result } = change(await getSites());
    if (next) await sitesItem.setValue(next);
    return result;
  });
}

/** 保存済みの追跡中のサイトからサイトキーの一覧を作る（順序に意味は無い） */
export function trackedSiteKeys(sites: TrackedSites): SiteKey[] {
  return Object.keys(sites);
}

/** 追跡中のサイトキーを返す（順序に意味は無い） */
export async function getTrackedSiteKeys(): Promise<SiteKey[]> {
  return trackedSiteKeys(await getSites());
}

/** 追加を拒否した理由 */
export type AddSiteRejection =
  | { reason: 'invalid' }
  | { reason: 'duplicate' }
  | { reason: 'nested'; nested: NestedSite };

/** 追加の結果。`rejection` が null なら `site` に追加した（足した）サイトキーが入る */
export interface AddSiteResult {
  site: SiteKey | null;
  rejection: AddSiteRejection | null;
}

/**
 * 入力（URL・`*.` / `www.` 付きの表記を含む）をサイトキーにし、追加してよいかを確かめる。
 * `isDuplicate` は同じキーのサイトが既にあるときに、それを重複として拒否するかを決める
 */
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

/** ブロックリストに入れた直後のブロック設定（有効な常時ブロック） */
function newBlockRule(now: Date): BlockRule {
  return { enabled: true, addedAt: now.toISOString(), timeLimit: null };
}

/**
 * ブロックリストに追加する。サイトが無ければ作り、あれば `block` を足す。
 * 既にブロック設定を持つサイト・既存のサイトと入れ子になるキーは拒否する
 */
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

/**
 * 追跡だけを始める（`block: null`）。既に追跡中のサイト・入れ子になるキーは拒否する
 */
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

/** サイトの 1 件を差し替える。サイトが無ければ何もせず null を返す */
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

/**
 * ブロックリストから外す（`block = null`。追跡は続く）。
 * 外す前のブロック設定を返す（ブロック設定が無ければ null）
 */
export async function removeBlock(site: SiteKey): Promise<BlockRule | null> {
  const changed = await updateSite(site, (current) => ({
    ...current,
    block: null
  }));
  return changed?.before.block ?? null;
}

/**
 * ブロックリストのトグル。切り替える前のブロック設定を返す（ブロック設定が無ければ何もせず null）
 */
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

/** 時間制限を変える。ブロック設定を持たないサイトなら何もせず false を返す */
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

/** youtube.com に書く値。`youtube` は非表示機能（null = 使わない）、`block` はアクセスブロック */
export interface YouTubeSiteUpdate {
  youtube: YouTubeFeatures | null;
  /**
   * アクセスブロック。null = ブロック設定ごと外す。
   * `enabled: false` は既存のブロック設定を無効にする（ブロック設定が無ければ作らない）
   */
  block: Pick<BlockRule, 'enabled' | 'timeLimit'> | null;
}

/**
 * youtube.com の YouTube 機能とアクセスブロックを書く。サイトが無ければ作る。
 * ブロックリストに入れた時刻（`addedAt`）は既存のブロック設定があれば引き継ぐ。
 * 無効のブロック設定は新しく作らない（非表示だけを使うサイトにブロック設定を生やさない）。
 * 変更前のサイト（無ければ null）を返す
 */
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

/** 追跡を止めたときの結果。ブロック設定か YouTube 機能が残るサイトは止めない */
export type StopTrackingResult = 'stopped' | 'not-found' | 'in-use';

/**
 * 追跡を止める（サイトを消す）。ブロック設定か YouTube 機能を持つサイトは消さない
 * （消すとブロックや非表示が画面の操作なしに外れる）。事実の行は呼び出し側で消す
 */
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

export interface ImportSitesResult {
  /** 新しく追跡を始めた・設定を足したサイト */
  changed: SiteKey[];
  /** 既存のサイトや先に取り込んだサイトと入れ子になるため取り込まなかったもの */
  skipped: { input: string; nested: NestedSite }[];
}

/**
 * 設定ファイルの追跡中のサイトを取り込む（書き込みは 1 回）。
 * 既存のサイトの設定は上書きせず、無い設定（ブロック設定・YouTube 機能）だけを足す
 * （重ねて取り込んでも増えず、手元で変えた設定が戻らない）。
 * 形式の誤りは黙って読み飛ばし、入れ子になるものは取り込まずに理由を返す
 */
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
      // YouTube 機能は youtube.com だけが持てる
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
