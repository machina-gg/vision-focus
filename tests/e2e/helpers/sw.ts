import type { BrowserContext, Worker } from '@playwright/test';

import { makeTestStorage, type TestStorageOptions } from './storage';

import { toDateKey } from '~/lib/time';
import type { DailySiteActivity } from '~/types/activity';
import type { SiteKey } from '~/types/site';
import type { StorageSchema } from '~/types/storage';

// 拡張機能のページを開いて storage を書くと、アプリの hydration が state を書き戻して直後の書き込みを消すため、SW から操作する

export async function getServiceWorker(
  context: BrowserContext
): Promise<Worker> {
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

export async function getBlockRuleFilters(
  context: BrowserContext
): Promise<string[]> {
  const sw = await getServiceWorker(context);

  return await sw.evaluate(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.map((rule) => rule.condition.urlFilter ?? '');
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

export async function waitForBlockRules(
  context: BrowserContext,
  domains: string[],
  timeout = 10_000
): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const filters = await getBlockRuleFilters(context);
    if (domains.every((d) => filters.some((f) => f.includes(d)))) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `ブロックルールが反映されない: ${domains.join(', ')} を待っていた`
  );
}

export async function waitForNoBlockRules(
  context: BrowserContext,
  domains: string[],
  timeout = 10_000
): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const filters = await getBlockRuleFilters(context);
    if (domains.every((d) => !filters.some((f) => f.includes(d)))) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `ブロックルールが外れない: ${domains.join(', ')} を待っていた`
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
