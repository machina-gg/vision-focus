import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright 設定ファイル
 *
 * Chrome 拡張機能のE2Eテスト用設定
 * - chromium.launchPersistentContext で拡張機能をロード
 * - headless: false 必須（Chrome拡張は headless 非対応）
 */
export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',

  // テストのタイムアウト（30秒）
  timeout: 30 * 1000,

  // アサーションのタイムアウト。
  // 3 並列で Chromium を立てるため、既定の 5 秒では拡張機能の
  // 初期化待ちに間に合わず、単体では通るテストが通し実行で落ちていた
  expect: {
    timeout: 10 * 1000
  },

  // テスト失敗時のリトライ回数。
  // 拡張機能テストは headless: false が必須で、3 並列で Chromium を
  // 立てるため起動待ちが揺れる。単体では通るテストが通し実行でまれに
  // 落ちるのはこの競合が原因なので、1 回リトライして吸収する
  retries: process.env.CI ? 2 : 1,

  // 並列実行設定（Chrome拡張は headless: false 必須のためメモリに注意）
  workers: 3,

  // 全テストを並列実行
  fullyParallel: true,

  // レポート設定
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // スクリーンショット・動画設定
  use: {
    // テスト失敗時のスクリーンショット
    screenshot: 'only-on-failure',
    // テスト失敗時の動画
    video: 'retain-on-failure',
    // トレース
    trace: 'on-first-retry'
  },

  // プロジェクト設定
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome']
        // Chrome拡張機能のロード設定
        // launchOptions は fixtures で設定するため、ここでは基本設定のみ
      }
    }
  ]

  // Webサーバー設定（不要）
  // Chrome拡張機能のテストはローカルファイルを使用するため、webServerは不要
});
