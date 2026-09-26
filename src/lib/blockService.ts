/**
 * BlockService - ブロック判定とルール生成の入口
 *
 * 流れはどちらも「登録（ブロック設定）ごとに `evaluateBlock` → ホスト名を覆う登録のどれかが
 * ブロックならブロック」の 1 本だけ。
 * 条件（一時停止・スケジュール・有効フラグ・時間制限）を並べるのは `evaluateBlock` だけで、
 * このモジュールは保存値を読んで `evaluateBlock` に渡す材料を揃え、結論を束ねるだけにする。
 * ここで条件を足すと、開いているページの判定と新しい遷移を止めるルールの結論が食い違う。
 *
 * ルールは登録のサイトキーごとに `||キー` を作り、本体とすべてのサブドメインを止める。
 * 判定も同じ範囲（ホスト名がキーと一致するか `.キー` で終わる登録すべて）で結論を出す。
 * 最も具体的な登録だけを見ると、親の登録がブロックしているのに子の登録で「許可」と判定し、
 * ルールと結論が割れる。
 *
 * @see docs/BLOCK_STATE_MACHINE.md
 */

import { getSettings, activityItem } from '~/lib/storage';
import { extractDomain } from '~/lib/domain';
import { isWithinSchedule, toDateKey } from '~/lib/time';
import { normalizeSiteKey } from '~/lib/siteKey';
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

/** 1 件の登録（ブロック設定）の判定結果 */
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

/** 1 件の登録。同じサイトキーの登録が複数あってもまとめない（どれかがブロックならブロック） */
interface Registration {
  site: SiteKey;
  rule: BlockRuleInput;
}

const NOT_BLOCKED: BlockState = { blocked: false, reason: null };

/** 有効かつ現在時刻が範囲内のスケジュールが 1 件以上あるか */
export function isAnyScheduleActive(
  schedules: Schedule[] | undefined
): boolean {
  return (schedules ?? []).some(
    (schedule) =>
      schedule.enabled &&
      isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
  );
}

/**
 * ブロックが効く時間帯か（`evaluateBlock` の `scheduleActive` に渡す値）。
 * 有効なスケジュールが 1 件も無ければ常に効く（すべて無効にしたスケジュールは「スケジュール無し」と同じ）。
 * 有効なスケジュールがあれば、そのどれかの範囲内だけ効く
 */
export function isBlockingWindowOpen(
  schedules: Schedule[] | undefined
): boolean {
  // 旧バージョンの設定や部分的なインポートで schedules が欠けている場合がある。
  // ここで例外を投げるとブロックルールの再計算が丸ごと止まり、
  // ブロックが一切効かなくなるため、未設定は「スケジュール無し」として扱う
  const enabled = (schedules ?? []).filter((schedule) => schedule.enabled);
  if (enabled.length === 0) return true;
  return isAnyScheduleActive(enabled);
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
 * ブロック設定を登録の単位で並べる（ブロックリストの並び順、最後に YouTube）。
 * YouTube のアクセスブロックは保存形がブロックリストの外にあるので、ここで同じ形に組み立てて
 * youtube.com の登録として加える
 */
function collectRegistrations(settings: AppSettings): Registration[] {
  const registrations: Registration[] = [];

  for (const item of settings.blockList) {
    const site = normalizeSiteKey(item.domain);
    // 空のキーはどのサイトも表さないので判定にもルールにも入れない
    if (!site) continue;
    registrations.push({
      site,
      rule: { enabled: item.enabled, timeLimit: item.timeLimit ?? null }
    });
  }

  const youtube = settings.youtube;
  if (youtube.enabled && youtube.blockAccess) {
    registrations.push({
      site: YOUTUBE_DOMAIN,
      rule: { enabled: true, timeLimit: youtube.timeLimit ?? null }
    });
  }

  return registrations;
}

function evaluate(
  registration: Registration,
  inputs: BlockInputs
): SiteBlockStatus {
  const { site, rule } = registration;
  const state = evaluateBlock(rule, {
    paused: inputs.settings.paused,
    scheduleActive: isBlockingWindowOpen(inputs.settings.schedules),
    todaySeconds: secondsOnDay(inputs.activity, site, toDateKey(inputs.now))
  });
  return { site, rule, state };
}

/** ホスト名が `||キー` の範囲に入るか（キーと一致するか `.キー` で終わる） */
function covers(site: SiteKey, hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return host === site || host.endsWith(`.${site}`);
}

/**
 * ホスト名を覆う登録を、具体的な順（キーが長い順。同じ長さなら登録順）に並べて判定する
 */
function statusesForHostname(
  hostname: string,
  registrations: readonly Registration[],
  inputs: BlockInputs
): SiteBlockStatus[] {
  return registrations
    .filter((registration) => covers(registration.site, hostname))
    .sort((a, b) => b.site.length - a.site.length)
    .map((registration) => evaluate(registration, inputs));
}

/**
 * 同じホスト名を覆う登録の判定結果から、そのホスト名の代表を 1 件選ぶ。
 * ブロックしている登録があればその中で最も具体的なもの（ルールが止めるので結論はブロック）。
 * 無ければ残り秒数がいちばん少ないもの（先に上限に達する制限）、それも無ければ最も具体的なもの
 */
function representative(
  statuses: readonly SiteBlockStatus[]
): SiteBlockStatus | null {
  const blocked = statuses.find((status) => status.state.blocked);
  if (blocked) return blocked;

  let tightest: SiteBlockStatus | null = null;
  for (const status of statuses) {
    const remaining = status.state.remainingSeconds;
    if (remaining === undefined) continue;
    const current = tightest?.state.remainingSeconds;
    if (current === undefined || remaining < current) tightest = status;
  }
  return tightest ?? statuses[0] ?? null;
}

/**
 * ホスト名の判定結果を代表 1 件で返す（ブロックの有無は、覆う登録のどれかがブロックか）。
 * ブロック設定の登録に覆われないホスト名は null
 */
export async function getSiteBlockStatus(
  hostname: string
): Promise<SiteBlockStatus | null> {
  const inputs = await loadInputs();
  return representative(
    statusesForHostname(hostname, collectRegistrations(inputs.settings), inputs)
  );
}

/**
 * 複数のホスト名を覆う登録すべての判定結果（保存値の読み出しは 1 回）。
 * 同じ登録は 1 件にまとめる。どの登録にも覆われないホスト名は結果に何も足さない
 */
export async function getSiteBlockStatuses(
  hostnames: readonly string[]
): Promise<SiteBlockStatus[]> {
  if (hostnames.length === 0) return [];

  const inputs = await loadInputs();
  const registrations = collectRegistrations(inputs.settings);
  const covering = new Set<Registration>();
  for (const hostname of hostnames) {
    for (const registration of registrations) {
      if (covers(registration.site, hostname)) covering.add(registration);
    }
  }
  return [...covering].map((registration) => evaluate(registration, inputs));
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
 * ルール生成（`getActiveBlockedDomains`）も同じ `evaluate` を通る。
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
 * declarativeNetRequest で止めるサイトキーの一覧（重複なし）。
 * すべての登録を判定と同じ `evaluate` に通し、ブロックする登録のキーを返す
 * （返したキーは `||キー` のルールになり、本体とすべてのサブドメインを止める）
 */
export async function getActiveBlockedDomains(): Promise<SiteKey[]> {
  const inputs = await loadInputs();
  const blocked = new Set<SiteKey>();
  for (const registration of collectRegistrations(inputs.settings)) {
    if (evaluate(registration, inputs).state.blocked) {
      blocked.add(registration.site);
    }
  }
  return [...blocked];
}
