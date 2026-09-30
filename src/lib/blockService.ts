// 条件は evaluateBlock にだけ置き、ここは材料を揃えるだけにする（足すと判定と転送ルールが食い違う）
// 許可サイトに当たるかを先に見る（転送ルールでは許可サイトの allow が覆うブロックの redirect より優先される）

import { getSettings, getSites, activityItem } from '~/lib/storage';
import { extractDomain } from '~/lib/domain';
import { isWithinSchedule, toDateKey } from '~/lib/time';
import { secondsOnDay } from '~/lib/activityStats';
import { evaluateBlock, type BlockState } from '~/lib/blockRule';
import { hasBlock, isAllowedHost, isAllowedSite } from '~/lib/blockList';
import { coveringSiteKeys } from '~/lib/siteKey';
import { objectOrFallback } from '~/lib/storedValue';
import { DEFAULT_ACTIVITY } from '~/types/storage';
import type { AppSettings, Schedule } from '~/types/storage';
import type { ActivityLog } from '~/types/activity';
import type { BlockRule, SiteEntry, SiteKey, TrackedSites } from '~/types/site';

export type { BlockReason, BlockState } from '~/lib/blockRule';

/** evaluateBlock が見るブロックの規則 */
type BlockRuleInput = Pick<BlockRule, 'enabled' | 'timeLimit'>;

/** 1 件のブロックの登録の判定結果 */
export interface SiteBlockStatus {
  /** 登録のサイトキー */
  site: SiteKey;
  /** 判定に使ったブロックの規則 */
  rule: BlockRuleInput;
  /** 判定結果 */
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

/**
 * 有効で、現在時刻が範囲内のスケジュールが 1 件以上あるか
 * @param schedules スケジュール（未設定なら undefined）
 * @returns 範囲内の有効なスケジュールがあれば true
 */
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
 * ブロックが効く時間帯か（有効なスケジュールが 1 件も無ければ常に true）
 * @param schedules スケジュール（未設定なら undefined）
 * @returns ブロックが効く時間帯なら true
 */
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

function registrationOf(site: SiteEntry): Registration | null {
  if (!hasBlock(site)) return null;
  return {
    site: site.domain,
    rule: { enabled: site.rule.enabled, timeLimit: site.rule.timeLimit }
  };
}

function coveringRegistration(
  hostname: string,
  sites: TrackedSites
): Registration | null {
  if (isAllowedHost(hostname, sites)) return null;
  for (const key of coveringSiteKeys(hostname, Object.keys(sites))) {
    const site = sites[key];
    const registration = site ? registrationOf(site) : null;
    if (registration) return registration;
  }
  return null;
}

function evaluate(
  registration: Registration,
  inputs: BlockInputs
): SiteBlockStatus {
  const { site, rule } = registration;
  const state = evaluateBlock(rule, {
    scheduleActive: isBlockingWindowOpen(inputs.settings.schedules),
    todaySeconds: secondsOnDay(inputs.activity, site, toDateKey(inputs.now))
  });
  return { site, rule, state };
}

/**
 * ホスト名を覆うブロックの登録の判定結果を返す
 * @param hostname 判定するホスト名
 * @returns 覆うブロックの登録の判定結果（許可サイトに当たるか、覆うブロックが無ければ null）
 */
export async function getSiteBlockStatus(
  hostname: string
): Promise<SiteBlockStatus | null> {
  const inputs = await loadInputs();
  const registration = coveringRegistration(hostname, inputs.sites);
  return registration ? evaluate(registration, inputs) : null;
}

/**
 * 複数のホスト名を覆うブロックの登録の判定結果を、登録ごとに 1 件で返す
 * @param hostnames 判定するホスト名（空なら空の配列を返す）
 * @returns いずれかのホスト名を覆うブロックの登録ごとの判定結果（許可サイトに当たるホスト名は数えない）
 */
export async function getSiteBlockStatuses(
  hostnames: readonly string[]
): Promise<SiteBlockStatus[]> {
  if (hostnames.length === 0) return [];

  const inputs = await loadInputs();
  const covering = new Map<SiteKey, Registration>();
  for (const hostname of hostnames) {
    const registration = coveringRegistration(hostname, inputs.sites);
    if (registration) covering.set(registration.site, registration);
  }
  return [...covering.values()].map((registration) =>
    evaluate(registration, inputs)
  );
}

/**
 * URL のホスト名のブロック判定（URL として読めなければブロックしない）
 * @param url 判定する URL
 * @returns ブロックの判定結果
 */
export async function getBlockState(url: string): Promise<BlockState> {
  const domain = extractDomain(url);
  if (!domain) return NOT_BLOCKED;

  return getBlockStateForDomain(domain);
}

/**
 * ホスト名のブロック判定（許可サイトに当たれば通し、そうでなければ覆うブロックの登録で決める）
 * @param domain 判定するホスト名
 * @returns ブロックの判定結果（覆う登録が無ければブロックしない）
 */
export async function getBlockStateForDomain(
  domain: string
): Promise<BlockState> {
  const status = await getSiteBlockStatus(domain);
  return status?.state ?? NOT_BLOCKED;
}

/**
 * URL をブロックするか
 * @param url 判定する URL
 * @returns ブロックするなら true（URL として読めなければ false）
 */
export async function shouldBlockUrl(url: string): Promise<boolean> {
  const state = await getBlockState(url);
  return state.blocked;
}

/** declarativeNetRequest のルールの元になるサイトキー */
export interface RuleTargets {
  /** 今ブロックしているブロックの登録（ブロック画面へ転送する） */
  redirect: SiteKey[];
  /** 許可サイトすべて（覆うブロックの転送より優先して通す） */
  allow: SiteKey[];
}

/**
 * declarativeNetRequest のルールの元になるサイトキーを返す
 * @returns 転送するサイトキーと通すサイトキー
 */
export async function getRuleTargets(): Promise<RuleTargets> {
  const inputs = await loadInputs();
  const redirect: SiteKey[] = [];
  const allow: SiteKey[] = [];
  for (const site of Object.values(inputs.sites)) {
    if (isAllowedSite(site)) {
      allow.push(site.domain);
      continue;
    }
    const registration = registrationOf(site);
    if (registration && evaluate(registration, inputs).state.blocked) {
      redirect.push(site.domain);
    }
  }
  return { redirect, allow };
}
