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

  // テスト失敗時のリトライ回数
  retries: 0,

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
