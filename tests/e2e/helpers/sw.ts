import type { BrowserContext, Worker } from '@playwright/test';

import { makeTestStorage, type TestStorageOptions } from './storage';

import { toDateKey } from '~/lib/time';
import type { DailySiteActivity } from '~/types/activity';
import type { SiteKey } from '~/types/site';
import type { StorageSchema } from '~/types/storage';

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
 * @wxt-dev/storage は値を生のオブジェクトのまま保存するため、同じ形式で書く
 * （キーは `local:` を除いた `settings` などで、接頭辞は保存領域の指定に
 * しか使われない）。
 */
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

      // 拡張機能のページが開いている状態で clear すると、アプリが自分の
      // state を書き戻して上書きすることがある。開いたまま書き換える
      // 場合は clear: false を指定する
      if (clear) await chrome.storage.local.clear();

      await chrome.storage.local.set(entries);
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
 * 時間制限の超過判定は activity（今日の行）を見るが、activity の変更は再計算の
 * トリガーにならないため、テストからは同じアラームを即時発火させて待つ。
 * 日付が変わって今日の行が空になったことも、同じ経路でルールに反映される。
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

/** storage の値を SW 経由で読む（アプリを開かずに読める） */
export async function getStorageViaSW<K extends keyof StorageSchema>(
  context: BrowserContext,
  key: K
): Promise<StorageSchema[K] | null> {
  const sw = await getServiceWorker(context);

  return await sw.evaluate(async (key) => {
    const result = await chrome.storage.local.get(key);
    // @wxt-dev/storage は値を生のまま保存するので、読み出しも変換しない
    return (result[key] ?? null) as StorageSchema[K] | null;
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

/**
 * 事実の表（`activity`）の今日の行から、1 サイト分の値を SW 経由で読む。
 *
 * ⚠ 行が無いときに 0 へフォールバックしない。null を返し、呼び出し側の
 * アサーション（`?? 0` を付けるかどうか）で「まだ書かれていない」と区別できるようにする。
 * 日付はアプリと同じローカル日付で引く
 */
export async function getTodayActivityViaSW(
  context: BrowserContext,
  site: SiteKey
): Promise<DailySiteActivity | null> {
  const log = await getStorageViaSW(context, 'activity');
  return log?.[toDateKey(new Date())]?.[site] ?? null;
}
