// 書き込みはモジュール内の待ち行列で直列化する。background 以外から書き込み関数を呼ぶと直列化が効かず変更が消える

import { isValidDomain, parseDomainInput } from '~/lib/domain';
import { createSerialQueue } from '~/lib/serialQueue';
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

const enqueue = createSerialQueue();

type SitesChange<T> = { next: TrackedSites | null; result: T };

/** `change` は読み出した値を書き換えず、変更後の値を `next` で返す（変更が無ければ null）。`change` が待つ間も待ち行列は次の処理へ進まない */
async function mutateSites<T>(
  change: (current: TrackedSites) => SitesChange<T> | Promise<SitesChange<T>>
): Promise<T> {
  return enqueue(async () => {
    const { next, result } = await change(await getSites());
    if (next) await sitesItem.setValue(next);
    return result;
  });
}

/**
 * 追跡中のサイトのサイトキー一覧
 * @param sites 追跡中のサイト
 * @returns サイトキー
 */
export function trackedSiteKeys(sites: TrackedSites): SiteKey[] {
  return Object.keys(sites);
}

/**
 * 保存領域から追跡中のサイトのサイトキー一覧を読む
 * @returns サイトキー
 */
export async function getTrackedSiteKeys(): Promise<SiteKey[]> {
  return trackedSiteKeys(await getSites());
}

/** サイトを追加しなかった理由 */
export type AddSiteRejection =
  | {
      /** ドメインとして正しい形でない */
      reason: 'invalid';
    }
  | {
      /** 既に追加済み */
      reason: 'duplicate';
    }
  | {
      /** 既存のサイトと入れ子になる */
      reason: 'nested';
      /** 入れ子になる既存のサイトとその関係 */
      nested: NestedSite;
    };

/** 追加の結果。rejection が null なら site に追加したサイトキーが入る */
export type AddSiteResult =
  | {
      /** 追加したサイトキー */
      site: SiteKey;
      /** 追加したので null */
      rejection: null;
    }
  | {
      /** 拒否したので null */
      site: null;
      /** 拒否した理由 */
      rejection: AddSiteRejection;
    };

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

/**
 * 入力をサイトキーにしてブロックリストに追加する（サイトが無ければ作る。既にブロック設定がある・入れ子になるなら拒否）
 * @param input 利用者が入力したドメインか URL
 * @param now 追加の時刻（ブロック日数と追跡開始の起点）
 * @returns 追加の結果
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
 * 入力をサイトキーにして追跡だけを始める（既に追跡中・入れ子になるなら拒否）
 * @param input 利用者が入力したドメインか URL
 * @param now 追跡を始めた時刻
 * @returns 追加の結果
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
 * ブロック設定を外し（追跡は続く）、外す前のブロック設定を返す（無ければ null）
 * @param site サイトキー
 * @returns 外す前のブロック設定（サイトかブロック設定が無ければ null）
 */
export async function removeBlock(site: SiteKey): Promise<BlockRule | null> {
  const changed = await updateSite(site, (current) => ({
    ...current,
    block: null
  }));
  return changed?.before.block ?? null;
}

/**
 * ブロック設定の有効・無効を切り替え、切り替える前の設定を返す（ブロック設定が無ければ何もせず null）
 * @param site サイトキー
 * @param enabled 有効にするなら true
 * @returns 切り替える前のブロック設定
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

/**
 * 時間制限を変える（null で外す）。ブロック設定を持たないサイトなら何もせず false
 * @param site サイトキー
 * @param timeLimit 新しい時間制限（null = 常時ブロック）
 * @returns 変えたら true
 */
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
  /** 非表示機能の設定（null = 使わない） */
  youtube: YouTubeFeatures | null;
  /** アクセスブロックの設定（null = 外す。無効の指定はブロック設定が無ければ作らない） */
  block: Pick<BlockRule, 'enabled' | 'timeLimit'> | null;
}

/** updateYouTubeSite の結果。rejection が null なら書き込んで、before に変更前の youtube.com のサイト（無ければ null）が入る */
export type UpdateYouTubeSiteResult<R> =
  | {
      /** 書き込んだので null */
      rejection: null;
      /** 変更前の youtube.com のサイト（無ければ null） */
      before: TrackedSite | null;
    }
  | {
      /** authorize が拒んだ理由 */
      rejection: R;
      /** 書き込まなかったので null */
      before: null;
    };

/**
 * 書き込み直前の youtube.com を見てアクセスブロックを弱めるかを判定し、authorize が通したときだけ非表示機能とアクセスブロックを書く（サイトが無ければ作る）
 * @param update 書く値
 * @param now サイトかブロック設定を新しく作るときの時刻
 * @param authorize 弱めるか（有効なアクセスブロックが外れる・無効になるか）を受け、拒むならその理由、通すなら null を返す。待ち行列の中で呼ぶので、判定から書き込みまでに別の書き込みは入らない
 * @returns 書き込んだなら変更前のサイト、拒んだならその理由
 */
export async function updateYouTubeSite<R>(
  update: YouTubeSiteUpdate,
  now: Date,
  authorize: (weakens: boolean) => Promise<R | null>
): Promise<UpdateYouTubeSiteResult<R>> {
  return mutateSites<UpdateYouTubeSiteResult<R>>(async (sites) => {
    const before = sites[YOUTUBE_DOMAIN] ?? null;
    const weakens =
      before?.block?.enabled === true && update.block?.enabled !== true;
    const rejection = await authorize(weakens);
    if (rejection !== null) {
      return { next: null, result: { rejection, before: null } };
    }

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
      result: { rejection: null, before }
    };
  });
}

/** stopTracking の結果。in-use はブロック設定か YouTube 機能が残っていて止めなかったとき */
export type StopTrackingResult = 'stopped' | 'not-found' | 'in-use';

/**
 * 追跡を止める（ブロック設定か YouTube 機能を持つサイトは止めない）。事実の行（activity）は消さないので呼び出し側で消す
 * @param site サイトキー
 * @returns stopped = 止めた / not-found = 追跡していない / in-use = 設定が残っていて止めなかった
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

/** importSites の結果。skipped は入れ子になるため取り込まなかったもの */
export interface ImportSitesResult {
  /** 追加したか設定を足したサイトキー */
  changed: SiteKey[];
  /** 入れ子になるため取り込まなかったもの */
  skipped: {
    /** 設定ファイルに書かれていた表記 */
    input: string;
    /** 入れ子の相手とその関係 */
    nested: NestedSite;
  }[];
}

/**
 * 設定ファイルの追跡中のサイトを取り込む（既存の設定は上書きせず、無い設定だけを足す）
 * @param imported 設定ファイルの追跡中のサイト（youtube.com 以外の YouTube 機能は捨てる）
 * @param now 新しく追跡を始めるサイトの追跡開始時刻
 * @returns 取り込んだサイトと取り込まなかったサイト
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
