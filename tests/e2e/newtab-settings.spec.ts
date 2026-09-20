import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  clearStorage,
  SELECTORS,
  UI_TEXT
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

    // ダウンロードボタンが表示される。
    // `^$` を含む filter は実質無条件で、count() も自動リトライしない。
    // data-testid で 1 件に絞り、ラベルと押せる状態まで確かめる
    const downloadButton = page.locator(SELECTORS.newtab.downloadButton);
    await expect(downloadButton).toHaveCount(1);
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toHaveText(UI_TEXT.newtab.download);
    await expect(downloadButton).toHaveAttribute(
      'title',
      UI_TEXT.newtab.downloadWallpaper
    );
    await expect(downloadButton).toBeEnabled();

    await page.close();
  });
});
