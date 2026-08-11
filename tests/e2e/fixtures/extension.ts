import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

import { startTestServer, type TestServer } from './testServer';

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

/** ワーカー単位で共有するフィクスチャ */
export type ExtensionWorkerFixtures = {
  /** テスト用のローカルサーバ（ワーカー単位で 1 台） */
  testServer: TestServer;
};

/**
 * test.extend でカスタムフィクスチャを定義
 *
 * - context: 拡張機能をロードした BrowserContext
 * - extensionId: ロードされた拡張機能のID
 */
export const test = base.extend<ExtensionFixtures, { testServer: TestServer }>({
  // ローカルサーバはワーカー単位で使い回す（テストごとの起動は無駄）
  testServer: [
    async ({}, use) => {
      const server = await startTestServer();
      await use(server);
      await server.close();
    },
    { scope: 'worker' }
  ],

  // BrowserContextのカスタマイズ
  context: async ({ testServer }, use) => {
    // Chrome拡張機能をロードした状態で BrowserContext を起動
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Chrome拡張は headless 非対応
      ignoreHTTPSErrors: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        // 全ホストをローカルのテストサーバへ向ける。
        // localhost / 127.0.0.1 は拡張機能の内部通信に使うため除外する
        `--host-resolver-rules=MAP * 127.0.0.1:${testServer.port}, EXCLUDE localhost`,
        // テストサーバは自己署名証明書を使うため、警告を無視させる
        '--ignore-certificate-errors'
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
