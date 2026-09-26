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
