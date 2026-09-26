import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',

  timeout: 30 * 1000,

  // 並列で Chromium を立てると、既定の 5 秒では拡張機能の初期化待ちに間に合わない
  expect: {
    timeout: 10 * 1000
  },

  // 並列起動で起動待ちが揺れ、通し実行でまれに落ちるのをリトライで吸収する
  retries: process.env.CI ? 2 : 1,

  workers: 3,

  fullyParallel: true,

  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    // 拡張機能は新ヘッドレス（channel: 'chromium'）ならロードできる
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome']
        // launchOptions は fixtures で設定する
      }
    }
  ]
});
