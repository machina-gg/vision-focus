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
