/**
 * BlockService - ブロック判定とルール生成の入口
 *
 * 流れはどちらも「ホスト名 → サイトキー → `evaluateBlock`」の 1 本だけ。
 * 条件（一時停止・スケジュール・有効フラグ・時間制限）を並べるのは `evaluateBlock` だけで、
 * このモジュールは保存値を読んで `evaluateBlock` に渡す材料を揃えるだけにする。
 * ここで条件を足すと、開いているページの判定と新しい遷移を止めるルールの結論が食い違う。
 *
 * @see docs/BLOCK_STATE_MACHINE.md
 */

import { getSettings, activityItem } from '~/lib/storage';
import { extractDomain } from '~/lib/domain';
import { isWithinSchedule, toDateKey } from '~/lib/time';
import { normalizeSiteKey, resolveSiteKey } from '~/lib/siteKey';
import { secondsOnDay } from '~/lib/activityStats';
import { evaluateBlock, type BlockState } from '~/lib/blockRule';
import { objectOrFallback } from '~/lib/storedValue';
import { YOUTUBE_DOMAIN } from '~/lib/youtubeBlockService';
import { DEFAULT_ACTIVITY } from '~/types/storage';
import type { AppSettings, Schedule } from '~/types/storage';
import type { ActivityLog } from '~/types/activity';
import type { BlockRule, SiteKey } from '~/types/site';

export type { BlockReason, BlockState } from '~/lib/blockRule';

/** `evaluateBlock` が見るブロック設定 */
export type BlockRuleInput = Pick<BlockRule, 'enabled' | 'timeLimit'>;

/** 1 サイトの判定結果 */
export interface SiteBlockStatus {
  site: SiteKey;
  rule: BlockRuleInput;
  state: BlockState;
}

/** 判定に使う保存値。1 回の判定の中では同じ値を使う */
interface BlockInputs {
  settings: AppSettings;
  activity: ActivityLog;
  now: Date;
}

const NOT_BLOCKED: BlockState = { blocked: false, reason: null };

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

async function loadInputs(): Promise<BlockInputs> {
  const [settings, activity] = await Promise.all([
    getSettings(),
    activityItem.getValue()
  ]);
  return {
    settings,
    activity: objectOrFallback(activity, DEFAULT_ACTIVITY),
    now: new Date()
  };
}

/**
 * サイトキー → ブロック設定。
 *
 * ブロックリストの項目を先に入れ、同じキーの 2 件目以降は捨てる（並び順で先の項目が優先）。
 * YouTube のアクセスブロックは保存形がブロックリストの外にあるので、ここで同じ形に組み立てて
 * youtube.com のキーに入れる。ブロックリストに youtube.com と同じキーの項目があれば
 * そちらを優先する（YouTube 側の設定は使わない）
 */
function collectRules(settings: AppSettings): Map<SiteKey, BlockRuleInput> {
  const rules = new Map<SiteKey, BlockRuleInput>();

  for (const item of settings.blockList) {
    const site = normalizeSiteKey(item.domain);
    // 空のキーはどのサイトも表さないので判定にもルールにも入れない
    if (!site || rules.has(site)) continue;
    rules.set(site, {
      enabled: item.enabled,
      timeLimit: item.timeLimit ?? null
    });
  }

  const youtube = settings.youtube;
  if (youtube.enabled && youtube.blockAccess && !rules.has(YOUTUBE_DOMAIN)) {
    rules.set(YOUTUBE_DOMAIN, {
      enabled: true,
      timeLimit: youtube.timeLimit ?? null
    });
  }

  return rules;
}

function evaluateSite(
  site: SiteKey,
  rule: BlockRuleInput,
  inputs: BlockInputs
): BlockState {
  return evaluateBlock(rule, {
    paused: inputs.settings.paused,
    scheduleActive: isAnyScheduleActive(inputs.settings.schedules),
    todaySeconds: secondsOnDay(inputs.activity, site, toDateKey(inputs.now))
  });
}

function statusForHostname(
  hostname: string,
  rules: Map<SiteKey, BlockRuleInput>,
  inputs: BlockInputs
): SiteBlockStatus | null {
  const site = resolveSiteKey(hostname, [...rules.keys()]);
  if (!site) return null;
  const rule = rules.get(site);
  if (!rule) return null;
  return { site, rule, state: evaluateSite(site, rule, inputs) };
}

/**
 * ホスト名が属するサイトのブロック設定と判定結果を返す。
 * ブロック設定を持つサイトに属さないホスト名は null
 */
export async function getSiteBlockStatus(
  hostname: string
): Promise<SiteBlockStatus | null> {
  const [status] = await getSiteBlockStatuses([hostname]);
  return status ?? null;
}

/**
 * 複数のホスト名をまとめて判定する（保存値の読み出しは 1 回）。
 * 同じサイトに属するホスト名は 1 件にまとめ、どのサイトにも属さないホスト名は結果に入れない
 */
export async function getSiteBlockStatuses(
  hostnames: readonly string[]
): Promise<SiteBlockStatus[]> {
  if (hostnames.length === 0) return [];

  const inputs = await loadInputs();
  const rules = collectRules(inputs.settings);
  const bySite = new Map<SiteKey, SiteBlockStatus>();
  for (const hostname of hostnames) {
    const status = statusForHostname(hostname, rules, inputs);
    if (status && !bySite.has(status.site)) bySite.set(status.site, status);
  }
  return [...bySite.values()];
}

/**
 * Determine the block state for a URL
 * 判定の本体は `getBlockStateForDomain`（URL からホスト名を取り出すだけ）
 */
export async function getBlockState(url: string): Promise<BlockState> {
  const domain = extractDomain(url);
  if (!domain) return NOT_BLOCKED;

  return getBlockStateForDomain(domain);
}

/**
 * ホスト名のブロック判定。
 *
 * ⚠ 判定（`getBlockState`）も記録（`shouldTrackBlockForDomain`）もここを通り、
 * ルール生成（`getActiveBlockedDomains`）も同じ `evaluateSite` を通る。
 * 経路ごとに条件を書くと片方だけが条件を取りこぼし、ブロックされていないのに
 * ブロック回数が増える・開いているタブと新しい遷移で結果がずれる
 */
export async function getBlockStateForDomain(
  domain: string
): Promise<BlockState> {
  const status = await getSiteBlockStatus(domain);
  return status?.state ?? NOT_BLOCKED;
}

/**
 * Check if a URL should be blocked (convenience method)
 */
export async function shouldBlockUrl(url: string): Promise<boolean> {
  const state = await getBlockState(url);
  return state.blocked;
}

/**
 * ブロック回数として記録するか。
 * 記録するかどうかは「ブロックされたかどうか」と同じなので、判定の結論をそのまま使う
 */
export async function shouldTrackBlockForDomain(
  domain: string
): Promise<boolean> {
  const state = await getBlockStateForDomain(domain);
  return state.blocked;
}

/**
 * declarativeNetRequest で止めるサイトキーの一覧。
 * すべてのサイトを判定と同じ `evaluateSite` に通し、ブロックするものだけを返す
 * （返したキーは `||キー` のルールになり、本体とすべてのサブドメインを止める）
 */
export async function getActiveBlockedDomains(): Promise<SiteKey[]> {
  const inputs = await loadInputs();
  const blocked: SiteKey[] = [];
  for (const [site, rule] of collectRules(inputs.settings)) {
    if (evaluateSite(site, rule, inputs).blocked) blocked.push(site);
  }
  return blocked;
}
