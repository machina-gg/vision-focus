import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Chrome拡張機能テスト用のカスタムフィクスチャ
 *
 * 拡張機能をロードした状態でテストを実行するための設定
 */

// 拡張機能のビルドディレクトリパス（CI では pnpm build で chrome-mv3-prod を生成）
import fs from 'fs';

const PROD_PATH = path.join(__dirname, '../../../build/chrome-mv3-prod');
const DEV_PATH = path.join(__dirname, '../../../build/chrome-mv3-dev');
const EXTENSION_PATH = fs.existsSync(PROD_PATH) ? PROD_PATH : DEV_PATH;

// カスタムフィクスチャの型定義
export type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
};

/**
 * test.extend でカスタムフィクスチャを定義
 *
 * - context: 拡張機能をロードした BrowserContext
 * - extensionId: ロードされた拡張機能のID
 */
export const test = base.extend<ExtensionFixtures>({
  // BrowserContextのカスタマイズ
  context: async ({}, use) => {
    // Chrome拡張機能をロードした状態で BrowserContext を起動
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Chrome拡張は headless 非対応
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox'
      ]
    });

    await use(context);
    await context.close();
  },

  // 拡張機能IDを取得するフィクスチャ
  extensionId: async ({ context }, use) => {
    // Service Worker (background.ts) のURLから拡張機能IDを取得
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  }
});

export { expect } from '@playwright/test';
