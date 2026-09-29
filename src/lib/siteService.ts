// 書き込みはモジュール内の待ち行列で直列化する。background 以外から書き込み関数を呼ぶと直列化が効かず変更が消える

import { isValidDomain, parseDomainInput } from '~/lib/domain';
import { createSerialQueue } from '~/lib/serialQueue';
import { getSites, sitesItem } from '~/lib/storage';
import { hasBlock, isAllowedSite } from '~/lib/blockList';
import {
  findNestingConflict,
  normalizeSiteKey,
  YOUTUBE_DOMAIN,
  type NestedSite
} from '~/lib/siteKey';
import type {
  BlockRule,
  SiteEntry,
  SiteKey,
  SiteRule,
  TimeLimit,
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

/**
 * 滞在時間などの出来事を記録してよいサイトのサイトキー一覧（「記録する」が OFF の許可サイトを除く）
 * @param sites 追跡中のサイト
 * @returns サイトキー
 */
export function recordableSiteKeys(sites: TrackedSites): SiteKey[] {
  return Object.values(sites)
    .filter((site) => !isAllowedSite(site) || site.rule.recordTime)
    .map((site) => site.domain);
}

/**
 * 保存領域から記録してよいサイトのサイトキー一覧を読む
 * @returns サイトキー（「記録する」が OFF の許可サイトを除く）
 */
export async function getRecordableSiteKeys(): Promise<SiteKey[]> {
  return recordableSiteKeys(await getSites());
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
      /** 許可サイトとして登録済み（許可とブロック・規則なしの間の付け替えはしない） */
      reason: 'allowed';
    }
  | {
      /** ブロックの規則を持つ登録として登録済み（許可サイトには変えない） */
      reason: 'blocked';
    }
  | {
      /** 規則なしの登録として追跡中（許可サイトには変えない） */
      reason: 'tracked';
    }
  | {
      /** 既存のサイトと許されない入れ子になる */
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
  kind: SiteRule['kind'] | null,
  sites: TrackedSites,
  rejectExisting: (existing: SiteEntry) => AddSiteRejection | null
): AddSiteResult {
  const site = normalizeSiteKey(parseDomainInput(input).domain);
  if (!isValidDomain(site))
    return { site: null, rejection: { reason: 'invalid' } };

  const existing = sites[site];
  if (existing) {
    const rejection = rejectExisting(existing);
    return rejection ? { site: null, rejection } : { site, rejection: null };
  }

  const nested = findNestingConflict(site, kind, sites);
  if (nested) return { site: null, rejection: { reason: 'nested', nested } };
  return { site, rejection: null };
}

function newSite(site: SiteKey, now: Date): SiteEntry {
  return {
    domain: site,
    trackedAt: now.toISOString(),
    rule: null,
    youtube: null
  };
}

function newBlockRule(now: Date): BlockRule {
  return {
    kind: 'block',
    enabled: true,
    addedAt: now.toISOString(),
    timeLimit: null
  };
}

/**
 * 入力をサイトキーにしてブロックリストに追加する（サイトが無ければ作る。既にブロックの規則がある・許可サイト・許されない入れ子になるなら拒否）
 * @param input 利用者が入力したドメインか URL
 * @param now 追加の時刻（ブロック日数と追跡開始の起点）
 * @returns 追加の結果
 */
export async function addBlock(
  input: string,
  now: Date
): Promise<AddSiteResult> {
  return mutateSites<AddSiteResult>((sites) => {
    const checked = checkAddition(input, 'block', sites, (existing) => {
      if (existing.rule?.kind === 'block') return { reason: 'duplicate' };
      if (existing.rule?.kind === 'allow') return { reason: 'allowed' };
      return null;
    });
    if (checked.rejection !== null) return { next: null, result: checked };

    const { site } = checked;
    const current = sites[site] ?? newSite(site, now);
    return {
      next: { ...sites, [site]: { ...current, rule: newBlockRule(now) } },
      result: checked
    };
  });
}

/**
 * 入力をサイトキーにして追跡だけを始める（既に追跡中・許されない入れ子になるなら拒否）
 * @param input 利用者が入力したドメインか URL
 * @param now 追跡を始めた時刻
 * @returns 追加の結果
 */
export async function addTrackedSite(
  input: string,
  now: Date
): Promise<AddSiteResult> {
  return mutateSites<AddSiteResult>((sites) => {
    const checked = checkAddition(input, null, sites, () => ({
      reason: 'duplicate'
    }));
    if (checked.rejection !== null) return { next: null, result: checked };

    const { site } = checked;
    return {
      next: { ...sites, [site]: newSite(site, now) },
      result: checked
    };
  });
}

/**
 * 入力をサイトキーにして許可サイトとして登録する（「記録する」は OFF で始める。既に許可サイトなら何もせず成功。ブロック・規則なしの登録と、許可サイトでない子孫があるなら拒否）
 * @param input 利用者が入力したドメインか URL
 * @param now 追跡を始めた時刻
 * @returns 追加の結果（既に許可サイトだったときも site にそのサイトキーが入る）
 */
export async function addAllowedSite(
  input: string,
  now: Date
): Promise<AddSiteResult> {
  return mutateSites<AddSiteResult>((sites) => {
    const checked = checkAddition(input, 'allow', sites, (existing) => {
      if (existing.rule?.kind === 'block') return { reason: 'blocked' };
      if (existing.rule === null) return { reason: 'tracked' };
      return null;
    });
    if (checked.rejection !== null) return { next: null, result: checked };

    const { site } = checked;
    if (sites[site]) return { next: null, result: checked };
    const allowed: SiteEntry = {
      ...newSite(site, now),
      rule: { kind: 'allow', recordTime: false }
    };
    return { next: { ...sites, [site]: allowed }, result: checked };
  });
}

/**
 * 許可サイトの「記録する」を切り替える（許可サイトでなければ何もせず false）。切り替えても過去の記録は消さない
 * @param site サイトキー
 * @param recordTime 滞在時間を記録するなら true
 * @returns 許可サイトがあって書き込んだら true
 */
export async function setAllowedSiteRecording(
  site: SiteKey,
  recordTime: boolean
): Promise<boolean> {
  return mutateSites((sites) => {
    const current = sites[site];
    if (!current || !isAllowedSite(current)) {
      return { next: null, result: false };
    }
    return {
      next: {
        ...sites,
        [site]: { ...current, rule: { ...current.rule, recordTime } }
      },
      result: true
    };
  });
}

async function updateSite(
  site: SiteKey,
  change: (current: SiteEntry) => SiteEntry
): Promise<{ before: SiteEntry; after: SiteEntry } | null> {
  return mutateSites((sites) => {
    const before = sites[site];
    if (!before) return { next: null, result: null };
    const after = change(before);
    return { next: { ...sites, [site]: after }, result: { before, after } };
  });
}

/**
 * ブロックの規則を外し（追跡は続く）、外す前のブロックの規則を返す（無ければ何もせず null）
 * @param site サイトキー
 * @returns 外す前のブロックの規則（サイトかブロックの規則が無ければ null）
 */
export async function removeBlock(site: SiteKey): Promise<BlockRule | null> {
  const changed = await updateSite(site, (current) =>
    hasBlock(current) ? { ...current, rule: null } : current
  );
  return changed && hasBlock(changed.before) ? changed.before.rule : null;
}

/**
 * ブロックの規則の有効・無効を切り替え、切り替える前の規則を返す（ブロックの規則が無ければ何もせず null）
 * @param site サイトキー
 * @param enabled 有効にするなら true
 * @returns 切り替える前のブロックの規則
 */
export async function setBlockEnabled(
  site: SiteKey,
  enabled: boolean
): Promise<BlockRule | null> {
  return mutateSites((sites) => {
    const current = sites[site];
    if (!current || !hasBlock(current)) return { next: null, result: null };
    return {
      next: {
        ...sites,
        [site]: { ...current, rule: { ...current.rule, enabled } }
      },
      result: current.rule
    };
  });
}

/**
 * 時間制限を変える（null で外す）。ブロックの規則を持たないサイトなら何もせず false
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
    if (!current || !hasBlock(current)) return { next: null, result: false };
    return {
      next: {
        ...sites,
        [site]: { ...current, rule: { ...current.rule, timeLimit } }
      },
      result: true
    };
  });
}

/** youtube.com に書く値。youtube は非表示機能（null = 使わない）、block はアクセスブロック（null = 外す） */
export interface YouTubeSiteUpdate {
  /** 非表示機能の設定（null = 使わない） */
  youtube: YouTubeFeatures | null;
  /** アクセスブロックの設定（null = 外す。無効の指定はブロックの規則が無ければ作らない） */
  block: Pick<BlockRule, 'enabled' | 'timeLimit'> | null;
}

/** youtube.com の登録の形から updateYouTubeSite が拒んだ理由（allowed = 許可サイトとして登録済み / nested = 新しく作ると許されない入れ子になる） */
export type YouTubeSiteRejection = Extract<
  AddSiteRejection,
  { reason: 'allowed' | 'nested' }
>;

/** updateYouTubeSite が書き込まなかった理由 */
export type UpdateYouTubeSiteRejection<R> =
  | {
      /** youtube.com の登録の形から拒んだ */
      by: 'site';
      /** 拒んだ理由 */
      rejection: YouTubeSiteRejection;
    }
  | {
      /** authorize が拒んだ */
      by: 'authorize';
      /** authorize が返した理由 */
      rejection: R;
    };

/** updateYouTubeSite の結果。rejection が null なら書き込んで、before に変更前の youtube.com の登録（無ければ null）が入る */
export type UpdateYouTubeSiteResult<R> =
  | {
      /** 書き込んだので null */
      rejection: null;
      /** 変更前の youtube.com の登録（無ければ null） */
      before: SiteEntry | null;
    }
  | {
      /** 書き込まなかった理由 */
      rejection: UpdateYouTubeSiteRejection<R>;
      /** 書き込まなかったので null */
      before: null;
    };

function youTubeBlockRule(
  update: YouTubeSiteUpdate,
  current: SiteEntry,
  now: Date
): BlockRule | null {
  if (!update.block) return null;
  const existing = hasBlock(current) ? current.rule : null;
  if (!update.block.enabled && !existing) return null;
  return {
    kind: 'block',
    addedAt: existing?.addedAt ?? now.toISOString(),
    enabled: update.block.enabled,
    timeLimit: update.block.timeLimit
  };
}

/**
 * 書き込み直前の youtube.com を見てアクセスブロックを弱めるかを判定し、authorize が通したときだけ非表示機能とアクセスブロックを書く（登録が無ければ作る）。youtube.com が許可サイトのときと、新しく作ると許されない入れ子になるときは authorize を呼ばずに拒む
 * @param update 書く値
 * @param now 登録かブロックの規則を新しく作るときの時刻
 * @param authorize 弱めるか（有効なアクセスブロックが外れる・無効になるか）を受け、拒むならその理由、通すなら null を返す。待ち行列の中で呼ぶので、判定から書き込みまでに別の書き込みは入らない
 * @returns 書き込んだなら変更前の登録、拒んだならその理由
 */
export async function updateYouTubeSite<R>(
  update: YouTubeSiteUpdate,
  now: Date,
  authorize: (weakens: boolean) => Promise<R | null>
): Promise<UpdateYouTubeSiteResult<R>> {
  return mutateSites<UpdateYouTubeSiteResult<R>>(async (sites) => {
    const reject = (
      rejection: UpdateYouTubeSiteRejection<R>
    ): SitesChange<UpdateYouTubeSiteResult<R>> => ({
      next: null,
      result: { rejection, before: null }
    });

    const before = sites[YOUTUBE_DOMAIN] ?? null;
    if (before && isAllowedSite(before)) {
      return reject({ by: 'site', rejection: { reason: 'allowed' } });
    }

    const current = before ?? newSite(YOUTUBE_DOMAIN, now);
    const rule = youTubeBlockRule(update, current, now);
    if (!before) {
      const nested = findNestingConflict(
        YOUTUBE_DOMAIN,
        rule?.kind ?? null,
        sites
      );
      if (nested) {
        return reject({ by: 'site', rejection: { reason: 'nested', nested } });
      }
    }

    const weakens =
      before !== null &&
      hasBlock(before) &&
      before.rule.enabled &&
      update.block?.enabled !== true;
    const rejection = await authorize(weakens);
    if (rejection !== null) return reject({ by: 'authorize', rejection });

    return {
      next: {
        ...sites,
        [YOUTUBE_DOMAIN]: { ...current, youtube: update.youtube, rule }
      },
      result: { rejection: null, before }
    };
  });
}

/** stopTracking の結果。in-use はブロックの規則か YouTube 機能が残っていて止めなかったとき */
export type StopTrackingResult = 'stopped' | 'not-found' | 'in-use';

/**
 * 追跡を止める（ブロックの規則か YouTube 機能を持つサイトは止めない。許可サイトは登録ごと消す）。事実の行（activity）は消さないので呼び出し側で消す
 * @param site サイトキー
 * @returns stopped = 止めた / not-found = 追跡していない / in-use = 設定が残っていて止めなかった
 */
export async function stopTracking(site: SiteKey): Promise<StopTrackingResult> {
  return mutateSites((sites) => {
    const current = sites[site];
    if (!current) return { next: null, result: 'not-found' as const };
    if (hasBlock(current) || current.youtube !== null) {
      return { next: null, result: 'in-use' as const };
    }
    const rest = { ...sites };
    delete rest[site];
    return { next: rest, result: 'stopped' as const };
  });
}

/** importSites の結果。skipped は許されない入れ子になるため取り込まなかったもの */
export interface ImportSitesResult {
  /** 追加したか設定を足したサイトキー */
  changed: SiteKey[];
  /** 許されない入れ子になるため取り込まなかったもの */
  skipped: {
    /** 設定ファイルに書かれていた表記 */
    input: string;
    /** 入れ子の相手とその関係 */
    nested: NestedSite;
  }[];
}

function mergedRule(
  current: SiteRule | null,
  imported: SiteRule | null
): SiteRule | null {
  if (current) return current;
  return imported?.kind === 'allow' ? null : imported;
}

/**
 * 設定ファイルの登録を取り込む（既存の設定は上書きせず、無い設定だけを足す。規則なしの既存の登録を許可サイトには変えない）
 * @param imported 設定ファイルの登録（youtube.com 以外と許可サイトの YouTube 機能は捨てる）
 * @param now 新しく追跡を始めるサイトの追跡開始時刻
 * @returns 取り込んだサイトと取り込まなかったサイト
 */
export async function importSites(
  imported: readonly SiteEntry[],
  now: Date
): Promise<ImportSitesResult> {
  return mutateSites((sites) => {
    let next: TrackedSites = sites;
    const changed: SiteKey[] = [];
    const skipped: ImportSitesResult['skipped'] = [];
    for (const entry of imported) {
      const checked = checkAddition(
        entry.domain,
        entry.rule?.kind ?? null,
        next,
        () => null
      );
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
      const rule = current ? mergedRule(current.rule, entry.rule) : entry.rule;
      const youtube =
        site === YOUTUBE_DOMAIN && rule?.kind !== 'allow'
          ? (current?.youtube ?? entry.youtube)
          : null;
      if (current && rule === current.rule && youtube === current.youtube) {
        continue;
      }
      const merged: SiteEntry = current
        ? { ...current, rule, youtube }
        : { domain: site, trackedAt: now.toISOString(), rule, youtube };
      next = { ...next, [site]: merged };
      changed.push(site);
    }
    return {
      next: changed.length > 0 ? next : null,
      result: { changed, skipped }
    };
  });
}
