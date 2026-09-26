// 条件は evaluateBlock にだけ置き、ここは材料を揃えて結論を束ねるだけにする（足すと判定とルールが食い違う）
// 判定はホスト名を覆う登録すべてで行う（最も具体的な登録だけを見ると、親の `||キー` ルールが止めているのに許可と判定する）

import { getSettings, getSites, activityItem } from '~/lib/storage';
import { extractDomain } from '~/lib/domain';
import { isWithinSchedule, toDateKey } from '~/lib/time';
import { secondsOnDay } from '~/lib/activityStats';
import { evaluateBlock, type BlockState } from '~/lib/blockRule';
import { objectOrFallback } from '~/lib/storedValue';
import { DEFAULT_ACTIVITY } from '~/types/storage';
import type { AppSettings, Schedule } from '~/types/storage';
import type { ActivityLog } from '~/types/activity';
import type { BlockRule, SiteKey, TrackedSites } from '~/types/site';

export type { BlockReason, BlockState } from '~/lib/blockRule';

/** evaluateBlock が見るブロック設定 */
export type BlockRuleInput = Pick<BlockRule, 'enabled' | 'timeLimit'>;

/** 1 件の登録（ブロック設定を持つ追跡中のサイト）の判定結果 */
export interface SiteBlockStatus {
  site: SiteKey;
  rule: BlockRuleInput;
  state: BlockState;
}

interface BlockInputs {
  settings: AppSettings;
  sites: TrackedSites;
  activity: ActivityLog;
  now: Date;
}

interface Registration {
  site: SiteKey;
  rule: BlockRuleInput;
}

const NOT_BLOCKED: BlockState = { blocked: false, reason: null };

/** 有効で、現在時刻が範囲内のスケジュールが 1 件以上あるか */
export function isAnyScheduleActive(
  schedules: Schedule[] | undefined
): boolean {
  return (schedules ?? []).some(
    (schedule) =>
      schedule.enabled &&
      isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
  );
}

/** ブロックが効く時間帯か（有効なスケジュールが 1 件も無ければ常に true） */
export function isBlockingWindowOpen(
  schedules: Schedule[] | undefined
): boolean {
  const enabled = (schedules ?? []).filter((schedule) => schedule.enabled);
  if (enabled.length === 0) return true;
  return isAnyScheduleActive(enabled);
}

async function loadInputs(): Promise<BlockInputs> {
  const [settings, sites, activity] = await Promise.all([
    getSettings(),
    getSites(),
    activityItem.getValue()
  ]);
  return {
    settings,
    sites,
    activity: objectOrFallback(activity, DEFAULT_ACTIVITY),
    now: new Date()
  };
}

function collectRegistrations(sites: TrackedSites): Registration[] {
  const registrations: Registration[] = [];
  for (const site of Object.values(sites)) {
    if (!site.block) continue;
    registrations.push({
      site: site.domain,
      rule: { enabled: site.block.enabled, timeLimit: site.block.timeLimit }
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

function covers(site: SiteKey, hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return host === site || host.endsWith(`.${site}`);
}

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

/** ホスト名を覆う登録の判定結果を代表 1 件で返す（覆う登録が無ければ null） */
export async function getSiteBlockStatus(
  hostname: string
): Promise<SiteBlockStatus | null> {
  const inputs = await loadInputs();
  return representative(
    statusesForHostname(hostname, collectRegistrations(inputs.sites), inputs)
  );
}

/** 複数のホスト名を覆う登録すべての判定結果を、登録ごとに 1 件で返す */
export async function getSiteBlockStatuses(
  hostnames: readonly string[]
): Promise<SiteBlockStatus[]> {
  if (hostnames.length === 0) return [];

  const inputs = await loadInputs();
  const registrations = collectRegistrations(inputs.sites);
  const covering = new Set<Registration>();
  for (const hostname of hostnames) {
    for (const registration of registrations) {
      if (covers(registration.site, hostname)) covering.add(registration);
    }
  }
  return [...covering].map((registration) => evaluate(registration, inputs));
}

/** URL のホスト名のブロック判定（URL として読めなければブロックしない） */
export async function getBlockState(url: string): Promise<BlockState> {
  const domain = extractDomain(url);
  if (!domain) return NOT_BLOCKED;

  return getBlockStateForDomain(domain);
}

/** ホスト名のブロック判定（覆う登録のどれかがブロックならブロック） */
export async function getBlockStateForDomain(
  domain: string
): Promise<BlockState> {
  const status = await getSiteBlockStatus(domain);
  return status?.state ?? NOT_BLOCKED;
}

export async function shouldBlockUrl(url: string): Promise<boolean> {
  const state = await getBlockState(url);
  return state.blocked;
}

/** ブロック回数として記録するか（ブロック判定の結論と同じ） */
export async function shouldTrackBlockForDomain(
  domain: string
): Promise<boolean> {
  const state = await getBlockStateForDomain(domain);
  return state.blocked;
}

/** 今ブロックしている登録のサイトキー一覧（declarativeNetRequest のルールの元になる） */
export async function getActiveBlockedDomains(): Promise<SiteKey[]> {
  const inputs = await loadInputs();
  const blocked = new Set<SiteKey>();
  for (const registration of collectRegistrations(inputs.sites)) {
    if (evaluate(registration, inputs).state.blocked) {
      blocked.add(registration.site);
    }
  }
  return [...blocked];
}
