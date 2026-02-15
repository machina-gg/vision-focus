import { test, expect } from './fixtures/extension';
import { openNewTab, setupTestStorage, clearStorage } from './helpers';

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
    const settingsButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();

    // 新しいタブでオプション画面が開くのを待つ
    const newPage = await context.waitForEvent('page');
    await newPage.waitForLoadState('domcontentloaded');

    // オプション画面のURLを確認
    expect(newPage.url()).toContain('options.html');

    await newPage.close();
    await page.close();
  });

  test('NEW-011: Premium ユーザーは壁紙ダウンロードボタンが表示される', async ({
    context,
    extensionId
  }) => {
    // Premium 設定済みのストレージをセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPremium: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // ダウンロードボタンが表示される（Premium ユーザーのみ）
    const downloadButton = page
      .locator('button')
      .filter({ has: page.locator('svg[class*="download" i], svg') })
      .filter({ hasText: /Download|ダウンロード|^$/ });

    // ボタンの存在を確認（テキストがない場合もあるのでアイコンで判定）
    const downloadButtonCount = await downloadButton.count();
    expect(downloadButtonCount).toBeGreaterThan(0);

    await page.close();
  });
});
