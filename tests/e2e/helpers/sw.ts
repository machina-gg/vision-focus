import type { BrowserContext, Worker } from '@playwright/test';

import { makeTestStorage, type TestStorageOptions } from './storage';

import { toDateKey } from '~/lib/time';
import type { DailySiteActivity } from '~/types/activity';
import type { SiteKey } from '~/types/site';
import type { StorageSchema } from '~/types/storage';

// 拡張機能のページを開いて storage を書くと、アプリの hydration が state を書き戻して直後の書き込みを消すため、SW から操作する

async function getServiceWorker(context: BrowserContext): Promise<Worker> {
  const [existing] = context.serviceWorkers();
  return existing ?? (await context.waitForEvent('serviceworker'));
}

export async function setupStorageViaSW(
  context: BrowserContext,
  data: Partial<StorageSchema>,
  options: { clear?: boolean } = {}
): Promise<void> {
  const sw = await getServiceWorker(context);
  const { clear = true } = options;

  await sw.evaluate(
    async (payload: string) => {
      const { entries, clear } = JSON.parse(payload) as {
        entries: Record<string, unknown>;
        clear: boolean;
      };

      // 拡張機能のページを開いたまま clear すると、アプリが state を書き戻すことがある（その場合は clear: false）
      if (clear) await chrome.storage.local.clear();

      await chrome.storage.local.set(entries);
    },
    JSON.stringify({ entries: data, clear })
  );
}

/** 動的ルールの requestDomains を action ごとに集めたもの */
export interface RuleDomains {
  /** ブロック画面へ転送するサイトキー */
  redirect: string[];
  /** 許可サイトとして通すサイトキー */
  allow: string[];
}

/**
 * 動的ルールの requestDomains を action ごとに読む
 * @param context 拡張機能を読み込んだコンテキスト
 * @returns 転送と許可のサイトキー
 */
export async function getRuleDomains(
  context: BrowserContext
): Promise<RuleDomains> {
  const sw = await getServiceWorker(context);

  return await sw.evaluate(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const domainsOf = (type: string) =>
      rules
        .filter((rule) => rule.action.type === type)
        .flatMap((rule) => rule.condition.requestDomains ?? []);
    return { redirect: domainsOf('redirect'), allow: domainsOf('allow') };
  });
}

/** activity の変更は再計算のトリガーにならないため、実装の check-schedule アラームを即時発火させる */
export async function triggerBlockRuleRecompute(
  context: BrowserContext
): Promise<void> {
  const sw = await getServiceWorker(context);
  await sw.evaluate(() =>
    chrome.alarms.create('check-schedule', { when: Date.now() + 100 })
  );
}

async function waitForRuleDomains(
  context: BrowserContext,
  done: (rules: RuleDomains) => boolean,
  failure: string,
  timeout: number
): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (done(await getRuleDomains(context))) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(failure);
}

export async function waitForBlockRules(
  context: BrowserContext,
  domains: string[],
  timeout = 10_000
): Promise<void> {
  await waitForRuleDomains(
    context,
    ({ redirect }) => domains.every((d) => redirect.includes(d)),
    `ブロックルールが反映されない: ${domains.join(', ')} を待っていた`,
    timeout
  );
}

export async function waitForNoBlockRules(
  context: BrowserContext,
  domains: string[],
  timeout = 10_000
): Promise<void> {
  await waitForRuleDomains(
    context,
    ({ redirect }) => domains.every((d) => !redirect.includes(d)),
    `ブロックルールが外れない: ${domains.join(', ')} を待っていた`,
    timeout
  );
}

/**
 * 許可サイトのルールが揃うまで待つ
 * @param context 拡張機能を読み込んだコンテキスト
 * @param domains 待つサイトキー
 * @param timeout 待つ上限（ミリ秒）
 */
export async function waitForAllowRules(
  context: BrowserContext,
  domains: string[],
  timeout = 10_000
): Promise<void> {
  await waitForRuleDomains(
    context,
    ({ allow }) => domains.every((d) => allow.includes(d)),
    `許可ルールが反映されない: ${domains.join(', ')} を待っていた`,
    timeout
  );
}

export async function getStorageViaSW<K extends keyof StorageSchema>(
  context: BrowserContext,
  key: K
): Promise<StorageSchema[K] | null> {
  const sw = await getServiceWorker(context);

  return await sw.evaluate(async (key) => {
    const result = await chrome.storage.local.get(key);
    return (result[key] ?? null) as StorageSchema[K] | null;
  }, key);
}

/** 保存領域（local）の全体を読む。取り込みを取りやめたときに何も書き換わっていないことを確かめるのに使う */
export async function getAllStorageViaSW(
  context: BrowserContext
): Promise<Record<string, unknown>> {
  const sw = await getServiceWorker(context);

  return await sw.evaluate(async () => chrome.storage.local.get(null));
}

export async function setupTestStorageViaSW(
  context: BrowserContext,
  options: TestStorageOptions & { clear?: boolean } = {}
): Promise<void> {
  const { clear, ...storageOptions } = options;
  await setupStorageViaSW(context, makeTestStorage(storageOptions), { clear });
}

export async function getTodayActivityViaSW(
  context: BrowserContext,
  site: SiteKey
): Promise<DailySiteActivity | null> {
  const log = await getStorageViaSW(context, 'activity');
  return log?.[toDateKey(new Date())]?.[site] ?? null;
}
