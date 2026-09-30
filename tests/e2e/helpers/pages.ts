import type { BrowserContext, Locator, Page } from '@playwright/test';
import { EXTENSION_URLS } from './constants';

const DEFAULT_HOLD_SECONDS = 5;
const HOLD_TIMEOUT_MARGIN_MS = 3000;

export function toggleAfter(anchor: Locator): Locator {
  return anchor.locator('xpath=following::button[@role="switch"][1]');
}

export async function openPopup(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(EXTENSION_URLS.popup(extensionId));
  await page.waitForLoadState('domcontentloaded');
  return page;
}

export async function openNewTab(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(EXTENSION_URLS.newtab(extensionId));
  await page.waitForLoadState('domcontentloaded');
  return page;
}

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

/** chrome.storage は chrome-extension:// のページでしか参照できない（about:blank では chrome が undefined） */
export async function openStoragePage(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(EXTENSION_URLS.options(extensionId));
  await page.waitForLoadState('domcontentloaded');
  return page;
}

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
 * 拡張機能のページから background へ、画面を通さずにメッセージを直接送る（@webext-core/messaging と同じ形で包み、応答の res を返す）
 * @param page 拡張機能のページ（chrome-extension://）
 * @param type メッセージの種類
 * @param data メッセージの本文
 * @returns ハンドラが返した応答
 */
export async function sendExtensionMessage(
  page: Page,
  type: string,
  data: unknown
): Promise<unknown> {
  return await page.evaluate(
    async ({ type, data }) => {
      const reply = (await chrome.runtime.sendMessage({
        id: 0,
        type,
        data,
        timestamp: Date.now()
      })) as { res?: unknown; err?: unknown } | undefined;
      if (!reply || reply.err !== undefined) {
        throw new Error(`メッセージが失敗した: ${JSON.stringify(reply)}`);
      }
      return reply.res;
    },
    { type, data }
  );
}
