import type { BrowserContext, Page } from '@playwright/test';
import { EXTENSION_URLS } from './constants';

/**
 * 拡張機能の各ページを開くヘルパー関数
 */

/**
 * Popup ページを開く
 *
 * @param context - BrowserContext
 * @param extensionId - 拡張機能ID
 * @returns Popup ページ
 */
export async function openPopup(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(EXTENSION_URLS.popup(extensionId));
  // ポップアップが表示されるまで待つ
  await page.waitForLoadState('domcontentloaded');
  return page;
}

/**
 * New Tab ページを開く
 *
 * @param context - BrowserContext
 * @param extensionId - 拡張機能ID
 * @returns New Tab ページ
 */
export async function openNewTab(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(EXTENSION_URLS.newtab(extensionId));
  await page.waitForLoadState('domcontentloaded');
  return page;
}

/**
 * Unblock 確認モーダルの長押しボタンを、確定するまで押し続ける
 *
 * 実装は 5 秒間の長押しで確定する（UnblockConfirmModal の HOLD_DURATION_MS）。
 * 単純なクリックでは確定しないため、ポインタを押したまま待機する。
 *
 * @param page - モーダルが表示されているページ
 */
export async function holdUnblockConfirm(page: Page): Promise<void> {
  const button = page.locator('[data-testid="unblock-confirm-hold-button"]');
  await button.waitFor({ state: 'visible' });

  const box = await button.boundingBox();
  if (!box) throw new Error('長押しボタンの位置を取得できない');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  // 確定するとモーダルが閉じるので、それを待つ（最長 8 秒）。
  // 固定待機だと進捗の進み方に左右されるため、状態で待つ
  try {
    await button.waitFor({ state: 'detached', timeout: 8000 });
  } finally {
    await page.mouse.up();
  }
}

/**
 * chrome.storage を操作するためのページを開く
 *
 * chrome.storage.local は拡張機能のページ（chrome-extension:// スキーム）でしか
 * 参照できない。context.newPage() で開いた about:blank に対して
 * setStorageData / getStorageData を呼ぶと chrome が undefined になり、
 * テストの準備段階で TypeError になる。
 *
 * ストレージ操作用のページが必要な場合は必ずこのヘルパーを使う。
 *
 * @param context - BrowserContext
 * @param extensionId - 拡張機能ID
 * @returns 拡張機能コンテキストのページ
 */
export async function openStoragePage(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(EXTENSION_URLS.options(extensionId));
  await page.waitForLoadState('domcontentloaded');
  return page;
}

/**
 * Options ページを開く
 *
 * @param context - BrowserContext
 * @param extensionId - 拡張機能ID
 * @param hash - URL ハッシュ（例: "analytics"）
 * @returns Options ページ
 */
export async function openOptions(
  context: BrowserContext,
  extensionId: string,
  hash?: string
): Promise<Page> {
  const page = await context.newPage();
  const url = EXTENSION_URLS.options(extensionId) + (hash ? `#${hash}` : '');
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

/**
 * 外部サイトを開く
 *
 * @param context - BrowserContext
 * @param url - 開くURL
 * @returns ページ
 */
export async function openExternalSite(
  context: BrowserContext,
  url: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

/**
 * ブロックルール（declarativeNetRequest の動的ルール）が反映されるまで待つ
 *
 * ルールの更新は storage の変更を受けた background が非同期に行うため、
 * 固定時間の sleep では足りないことがある。実際のルールを見て待つ。
 *
 * @param page - 拡張機能のページ（chrome API が使えるもの）
 * @param domains - ルールに含まれているべきドメイン
 */
export async function waitForBlockRules(
  page: Page,
  domains: string[],
  timeout = 10_000
): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const filters = await page.evaluate(async () => {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      return rules.map((rule) => rule.condition.urlFilter ?? '');
    });

    if (domains.every((d) => filters.some((f) => f.includes(d)))) return;
    await page.waitForTimeout(100);
  }

  throw new Error(
    `ブロックルールが反映されない: ${domains.join(', ')} を待っていた`
  );
}
