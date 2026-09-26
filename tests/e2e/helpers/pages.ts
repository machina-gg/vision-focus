import type { BrowserContext, Locator, Page } from '@playwright/test';
import { EXTENSION_URLS } from './constants';

// アプリの既定の長押し秒数（DEFAULT_UNBLOCK_CONFIRM_SETTINGS と同じ値）
const DEFAULT_HOLD_SECONDS = 5;
// 長押しの秒数に足す待機の余裕（描画とモーダルが閉じるまでの遅れを吸収する）
const HOLD_TIMEOUT_MARGIN_MS = 3000;

/**
 * 拡張機能の各ページを開くヘルパー関数
 */

/**
 * ある要素より後ろにある最初のトグル（`role="switch"`）を指す
 *
 * `Toggle`（src/components/ui/Toggle）はラベルを button の外の兄弟要素に
 * 描画するため、`[role="switch"]` を `has: text=…` で絞り込んでも構造上
 * 一致しない（絞り込みは常に空になり、テストが何も検査しなくなる）。
 * data-testid を持たないトグルは、見出しやラベルからドキュメント順でたどる。
 *
 * @param anchor - 見出しなど、トグルの直前にある要素
 */
export function toggleAfter(anchor: Locator): Locator {
  return anchor.locator('xpath=following::button[@role="switch"][1]');
}

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
 * 実装は設定した秒数（既定 5 秒）の長押しで確定する（UnblockConfirmModal の holdSeconds）。
 * 単純なクリックでは確定しないため、ポインタを押したまま待機する。
 *
 * @param page - モーダルが表示されているページ
 * @param holdSeconds - 設定している長押しの秒数（待機の上限をこれに合わせる）
 * @returns 押し始めてからモーダルが閉じるまでの経過ミリ秒
 */
export async function holdUnblockConfirm(
  page: Page,
  holdSeconds = DEFAULT_HOLD_SECONDS
): Promise<number> {
  const button = page.locator('[data-testid="unblock-confirm-hold-button"]');
  await button.waitFor({ state: 'visible' });

  const box = await button.boundingBox();
  if (!box) throw new Error('長押しボタンの位置を取得できない');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const startedAt = Date.now();

  // 確定するとモーダルが閉じるので、それを待つ（上限は秒数 + 余裕）。
  // 固定待機だと進捗の進み方に左右されるため、状態で待つ
  try {
    await button.waitFor({
      state: 'detached',
      timeout: holdSeconds * 1000 + HOLD_TIMEOUT_MARGIN_MS
    });
    return Date.now() - startedAt;
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
