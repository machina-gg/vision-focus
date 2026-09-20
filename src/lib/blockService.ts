/**
 * BlockService - Centralized Block State Management
 *
 * This service provides a single source of truth for block state determination.
 * All block-related logic should go through this service to ensure consistency.
 *
 * Time limit logic has been extracted to ~/lib/timeLimitService.ts
 * YouTube-specific logic has been extracted to ~/lib/youtubeBlockService.ts
 *
 * @see docs/BLOCK_STATE_MACHINE.md for state transition diagrams
 */

import { getSettings, getAnalytics } from '~/lib/storage';
import { extractDomain, matchesDomain } from '~/lib/domain';
import { isWithinSchedule } from '~/lib/time';
import type { AppSettings, BlockItem, Schedule } from '~/types/storage';
import {
  hasExceededTimeLimit,
  getRemainingTime,
  checkTimeLimitExceeded
} from '~/lib/timeLimitService';

// Block reason type - matches the state machine documentation
export type BlockReason = 'always_blocked' | 'time_limit_exceeded' | null;

// Block state result
export interface BlockState {
  blocked: boolean;
  reason: BlockReason;
  remainingSeconds?: number;
}

/**
 * Find the BlockItem that matches a domain (supports wildcards)
 * This is the single entry point for domain-to-block-item mapping
 */
export async function findBlockItemForDomain(
  domain: string,
  settings?: AppSettings
): Promise<BlockItem | null> {
  const s = settings ?? (await getSettings());
  return s.blockList.find((item) => matchesDomain(domain, item)) || null;
}

/**
 * Find the enabled BlockItem that matches a domain
 * Only returns items where enabled=true
 */
export async function findEnabledBlockItemForDomain(
  domain: string,
  settings?: AppSettings
): Promise<BlockItem | null> {
  const item = await findBlockItemForDomain(domain, settings);
  return item?.enabled ? item : null;
}

/**
 * Check if any schedule is currently active
 * No schedules = always active (return true)
 */
export function isAnyScheduleActive(
  schedules: Schedule[] | undefined
): boolean {
  // 旧バージョンの設定や部分的なインポートで schedules が欠けている場合がある。
  // ここで例外を投げるとブロックルールの再計算が丸ごと止まり、
  // ブロックが一切効かなくなるため、未設定は「常時有効」として扱う
  if (!schedules || schedules.length === 0) return true;
  return schedules.some(
    (schedule) =>
      schedule.enabled &&
      isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
  );
}

/**
 * YouTube domains to block when blockAccess is enabled
 *
 * 先頭のドメインは時間制限の計測キーでもあり、`youtubeBlockService` の
 * `YOUTUBE_DOMAIN`（`analytics.timeLimitUsage` のキー）と同じ値である必要がある。
 * 値がずれると時間制限の超過判定が別のキーを読み、永久に超過しなくなる
 * （ずれたことは `blockService.test.ts` の照合で落ちる）
 */
const YOUTUBE_DOMAINS = ['youtube.com', 'www.youtube.com'];

/**
 * ドメインがブロックリストのいずれかの項目に一致するか
 *
 * 一致する場合はブロックリスト側の設定（有効/無効・時間制限）が優先され、
 * 仮想のブロック項目は使わない
 */
function isCoveredByBlockList(domain: string, settings: AppSettings): boolean {
  return settings.blockList.some((item) => matchesDomain(domain, item));
}

/**
 * YouTube を「仮想のブロック項目」として返す
 *
 * YouTube はブロックリストに項目を持たないため、判定（`getBlockState`）と
 * ルール生成（`getActiveBlockedDomains`）が別々の条件で YouTube を扱うと、
 * 開いているタブと新しい遷移で結果がずれる（#392）。両者がこの関数だけを見ることで
 * ブロックリストと同じ意味論（`timeLimit` なし = 常時ブロック / あり = 超過後にブロック）に揃う。
 *
 * アクセスブロックが無効なら null（= ブロック対象ではない）を返す
 */
export function getYouTubeBlockItem(settings: AppSettings): BlockItem | null {
  const youtube = settings.youtube;
  if (!youtube?.enabled || !youtube.blockAccess) {
    return null;
  }

  return {
    // 仮想項目はストレージに保存されず UI にも出ないため、id / createdAt は判定に使われない
    id: 'virtual:youtube',
    createdAt: new Date(0).toISOString(),
    domain: YOUTUBE_DOMAINS[0],
    // ワイルドカードではないが、matchesDomain はサブドメイン
    // （www.youtube.com / m.youtube.com 等）も一致させる。
    // declarativeNetRequest の `||youtube.com` と同じ範囲になる
    isWildcard: false,
    enabled: true,
    timeLimit: youtube.timeLimit ?? null
  };
}

/**
 * ドメインに対応するブロック項目の照合結果
 */
export interface MatchedBlockItem {
  item: BlockItem;
  /**
   * ブロックリストではなく YouTube 設定から組み立てた仮想項目か
   *
   * 仮想項目は時間制限の使用実績をホスト名ではなく項目のドメインで引く（#392）ため、
   * 呼び出し側がこの区別を必要とする
   */
  isVirtual: boolean;
}

/**
 * ドメインに対応するブロック項目を優先順位付きで探す
 *
 * ブロックリスト → YouTube の仮想ブロック項目の順に見る
 * （ブロックリストに同じドメインの項目があればそちらの設定が優先される）。
 *
 * ⚠ 判定（`getBlockState`）と記録（`shouldTrackBlockForDomain`）は必ずこの関数を通す。
 * 片方だけが優先順位を持っていると、ブロックはされるのに記録されないドメインが出る
 * （machina-gg/vision-focus#351）
 */
export async function findMatchingBlockItem(
  domain: string,
  settings?: AppSettings
): Promise<MatchedBlockItem | null> {
  const s = settings ?? (await getSettings());

  const listItem = await findBlockItemForDomain(domain, s);
  if (listItem) {
    return { item: listItem, isVirtual: false };
  }

  const youtubeItem = getYouTubeBlockItem(s);
  if (youtubeItem && matchesDomain(domain, youtubeItem)) {
    return { item: youtubeItem, isVirtual: true };
  }

  return null;
}

/**
 * Determine the block state for a URL
 * This is the main entry point for block state determination
 *
 * Flow (see BLOCK_STATE_MACHINE.md):
 * 1. Check global pause
 * 2. Find matching block item (ブロックリスト → YouTube の仮想ブロック項目)
 * 3. Check if item is enabled
 * 4. Check schedules
 * 5. Check time limits
 */
export async function getBlockState(url: string): Promise<BlockState> {
  const domain = extractDomain(url);
  if (!domain) return { blocked: false, reason: null };

  const settings = await getSettings();

  // Step 1: Check global pause
  if (settings.paused) {
    return { blocked: false, reason: null };
  }

  // Step 2: Find matching block item（ブロックリスト → YouTube の仮想ブロック項目）
  const matched = await findMatchingBlockItem(domain, settings);
  if (!matched) {
    return { blocked: false, reason: null };
  }
  const blockItem = matched.item;

  // Step 3: Check if item is enabled
  if (!blockItem.enabled) {
    return { blocked: false, reason: null };
  }

  // Step 4: Check schedules
  if (!isAnyScheduleActive(settings.schedules)) {
    return { blocked: false, reason: null };
  }

  // Step 5: Check time limits
  if (blockItem.timeLimit) {
    // ブロックリストの項目はアクセスしたホスト名ごとに計測されるが、YouTube の計測は
    // youtubeBlockService が 'youtube.com' 固定で記録する。仮想項目のときだけ
    // ホスト名ではなく項目のドメインで使用実績を引く（#392）
    const usageDomain = matched.isVirtual ? blockItem.domain : domain;
    const exceeded = await hasExceededTimeLimit(usageDomain, blockItem);
    const remaining = exceeded
      ? 0
      : await getRemainingTime(usageDomain, blockItem);
    return {
      blocked: exceeded,
      reason: exceeded ? 'time_limit_exceeded' : null,
      remainingSeconds: remaining ?? undefined
    };
  }

  // No time limit - always blocked
  return { blocked: true, reason: 'always_blocked' };
}

/**
 * Check if a URL should be blocked (convenience method)
 */
export async function shouldBlockUrl(url: string): Promise<boolean> {
  const state = await getBlockState(url);
  return state.blocked;
}

/**
 * Check if a domain should be tracked for block count
 * This validates all conditions: enabled, schedule, etc.
 *
 * 照合は `getBlockState` と同じ `findMatchingBlockItem` を通すため、
 * ブロックリストに項目を持たない YouTube も記録対象になる（#351）
 */
export async function shouldTrackBlockForDomain(
  domain: string
): Promise<boolean> {
  const settings = await getSettings();

  // Check global pause
  if (settings.paused) {
    return false;
  }

  // Find matching block item（ブロックリスト → YouTube の仮想ブロック項目）
  const matched = await findMatchingBlockItem(domain, settings);
  if (!matched) {
    return false;
  }

  // Check if enabled
  if (!matched.item.enabled) {
    return false;
  }

  // Check schedules
  if (!isAnyScheduleActive(settings.schedules)) {
    return false;
  }

  return true;
}

/**
 * Get list of domains that should be actively blocked via declarativeNetRequest
 * Includes always-blocked sites and time-limited sites that have exceeded their limit
 * Also includes YouTube domains when YouTube blockAccess is enabled (subject to schedule)
 */
export async function getActiveBlockedDomains(): Promise<string[]> {
  const settings = await getSettings();
  const blockedDomains: string[] = [];

  // If paused, don't block anything
  if (settings.paused) {
    return [];
  }

  // Always-blocked sites (enabled and no time limit) — スケジュールに関係なく常にブロック
  const alwaysBlockedDomains = settings.blockList
    .filter((item) => item.enabled && !item.timeLimit)
    .map((item) => item.domain);
  blockedDomains.push(...alwaysBlockedDomains);

  // スケジュールがアクティブな場合のみ、YouTube と時間制限サイトをブロック
  if (isAnyScheduleActive(settings.schedules)) {
    const analytics = await getAnalytics();

    // YouTube は仮想のブロック項目として、開いているタブの判定（getBlockState）と
    // 同じ条件で扱う。時間制限があるときは超過後だけブロックする（#392）
    const youtubeItem = getYouTubeBlockItem(settings);
    const youtubeBlocked =
      youtubeItem !== null &&
      (!youtubeItem.timeLimit ||
        checkTimeLimitExceeded(
          youtubeItem.domain,
          youtubeItem.timeLimit,
          analytics
        ));

    if (youtubeBlocked) {
      for (const domain of YOUTUBE_DOMAINS) {
        // ブロックリストに一致する項目があれば、そちらの設定が優先される
        // （getBlockState の Step 2 と同じ優先順位。ここで揃えないと、
        //   開いているタブと新しい遷移で結果がずれる）
        if (isCoveredByBlockList(domain, settings)) continue;
        if (blockedDomains.includes(domain)) continue;
        blockedDomains.push(domain);
      }
    }

    // Also include time-limited sites that have exceeded their limit
    for (const item of settings.blockList) {
      if (!item.enabled || !item.timeLimit) continue;
      if (blockedDomains.includes(item.domain)) continue;

      if (checkTimeLimitExceeded(item.domain, item.timeLimit, analytics)) {
        blockedDomains.push(item.domain);
      }
    }
  }

  return blockedDomains;
}
