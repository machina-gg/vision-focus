import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  clearStorage,
  SELECTORS
} from './helpers';

/**
 * E2Eテスト: NewTab 画面 - 設定とプレミアム機能
 *
 * NEW-005, NEW-011 のテストケースを実装
 */

test.describe('NewTab 画面 - 設定とプレミアム機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openNewTab(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('NEW-005: 設定アイコンクリックでオプション画面が開く', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 設定アイコン（右下）をクリック
    const settingsButton = page.locator(SELECTORS.newtab.settingsButton).last();

    // クリックより先に待機を張る（クリック後だとタブ生成を取りこぼす）
    const newPagePromise = context.waitForEvent('page');
    await settingsButton.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');

    // オプション画面のURLを確認
    expect(newPage.url()).toContain('options.html');

    await newPage.close();
    await page.close();
  });

  test('NEW-011: 壁紙ダウンロードボタンが表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // ダウンロードボタンが表示される
    const downloadButton = page
      .locator(SELECTORS.newtab.downloadButton)
      .filter({ hasText: /Download|ダウンロード|^$/ });

    // ボタンの存在を確認（テキストがない場合もあるのでアイコンで判定）
    const downloadButtonCount = await downloadButton.count();
    expect(downloadButtonCount).toBeGreaterThan(0);

    await page.close();
  });
});
