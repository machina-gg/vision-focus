import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

import { startTestServer, type TestServer } from './testServer';

import fs from 'fs';

const PROD_PATH = path.join(__dirname, '../../../.output/chrome-mv3');
const DEV_PATH = path.join(__dirname, '../../../.output/chrome-mv3-dev');
const EXTENSION_PATH = fs.existsSync(PROD_PATH) ? PROD_PATH : DEV_PATH;

export type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  /** 拡張機能の表示言語は chrome.i18n が起動言語（`--lang`）から決めるため、切り替えはここでしか行えない */
  browserLanguage: string | undefined;
};

export const test = base.extend<ExtensionFixtures, { testServer: TestServer }>({
  testServer: [
    async ({}, use) => {
      const server = await startTestServer();
      await use(server);
      await server.close();
    },
    { scope: 'worker' }
  ],

  browserLanguage: [undefined, { option: true }],

  context: async ({ testServer, headless, browserLanguage }, use) => {
    const context = await chromium.launchPersistentContext('', {
      // 旧 headless: true（chrome-headless-shell）は拡張機能をロードできないため、新ヘッドレスの channel: 'chromium' を使う
      channel: 'chromium',
      headless,
      ignoreHTTPSErrors: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        // localhost / 127.0.0.1 は拡張機能の内部通信に使うため振り向け先から除外する
        `--host-resolver-rules=MAP * 127.0.0.1:${testServer.port}, EXCLUDE localhost`,
        '--ignore-certificate-errors',
        ...(browserLanguage ? [`--lang=${browserLanguage}`] : [])
      ]
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  }
});

export { expect } from '@playwright/test';
