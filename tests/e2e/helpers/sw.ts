import type { BrowserContext, Worker } from '@playwright/test';

import { makeTestStorage, type TestStorageOptions } from './storage';

/**
 * Service Worker（background）経由の操作ヘルパー
 *
 * なぜページ経由ではなく SW を使うのか:
 *
 * 1. **上書きされない** — storage を書くために options.html を開くと、アプリの
 *    hydration が自分の state を書き戻し、直後の書き込みを消してしまう。
 *    さらに UI は時間制限値をプリセットに丸めるため、書いた値が別の値に
 *    変わることもある（`roundToNearestPreset`）。SW にはアプリが無い。
 * 2. **拡張機能の API が使える** — declarativeNetRequest の動的ルールや
 *    chrome.alarms を、アプリを開かずに読み書きできる。
 */

export async function getServiceWorker(
  context: BrowserContext
): Promise<Worker> {
  const [existing] = context.serviceWorkers();
  return existing ?? (await context.waitForEvent('serviceworker'));
}

/**
 * storage を初期化して複数キーをまとめて書く
 *
 * @plasmohq/storage は値を JSON 文字列として保存するため、同じ形式で書く。
 */
export async function setupStorageViaSW(
  context: BrowserContext,
  data: Record<string, unknown>,
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

      // 拡張機能のページが開いている状態で clear すると、アプリが自分の
      // state を書き戻して上書きすることがある。開いたまま書き換える
      // 場合は clear: false を指定する
      if (clear) await chrome.storage.local.clear();

      const stringified: Record<string, string> = {};
      for (const [key, value] of Object.entries(entries)) {
        stringified[key] = JSON.stringify(value);
      }
      await chrome.storage.local.set(stringified);
    },
    JSON.stringify({ entries: data, clear })
  );
}

/** 現在の動的ブロックルールの urlFilter 一覧を取得する */
export async function getBlockRuleFilters(
  context: BrowserContext
): Promise<string[]> {
  const sw = await getServiceWorker(context);

  return await sw.evaluate(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.map((rule) => rule.condition.urlFilter ?? '');
  });
}

/**
 * ブロックルールの再計算を促す
 *
 * 実装は 1 分間隔の `check-schedule` アラームで `updateBlockRules()` を呼ぶ。
 * 時間制限の超過判定は analytics を見るが、analytics の変更は再計算の
 * トリガーにならないため、テストからは同じアラームを即時発火させて待つ。
 */
export async function triggerBlockRuleRecompute(
  context: BrowserContext
): Promise<void> {
  const sw = await getServiceWorker(context);
  await sw.evaluate(() =>
    chrome.alarms.create('check-schedule', { when: Date.now() + 100 })
  );
}

/** 指定ドメインがブロックルールに載るまで待つ */
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

/** 指定ドメインがブロックルールから外れるまで待つ */
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

/**
 * 期限切れの Time Limit 使用実績のリセットを促す
 *
 * 実装は 1 分間隔の `time-limit-reset` アラームで `resetExpiredUsage()` を
 * 呼び、`lastDailyReset` / `lastHourlyReset` が現在の日付・時刻と違う
 * ドメインの使用秒数を 0 に戻す。
 */
export async function triggerTimeLimitReset(
  context: BrowserContext
): Promise<void> {
  const sw = await getServiceWorker(context);
  await sw.evaluate(() =>
    chrome.alarms.create('time-limit-reset', { when: Date.now() + 100 })
  );
}

/** storage の値を SW 経由で読む（アプリを開かずに読める） */
export async function getStorageViaSW<T = unknown>(
  context: BrowserContext,
  key: string
): Promise<T | null> {
  const sw = await getServiceWorker(context);

  return await sw.evaluate(async (key) => {
    const result = await chrome.storage.local.get(key);
    const raw = result[key];
    if (raw === undefined) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, key);
}

/**
 * テスト用の storage データを SW 経由で書き込む
 *
 * アプリに上書きされないため、言語設定のように「アプリが読み込んで描画に
 * 使う」値を確実に置きたいときはこちらを使う。
 */
export async function setupTestStorageViaSW(
  context: BrowserContext,
  options: TestStorageOptions & { clear?: boolean } = {}
): Promise<void> {
  const { clear, ...storageOptions } = options;
  await setupStorageViaSW(context, makeTestStorage(storageOptions), { clear });
}
