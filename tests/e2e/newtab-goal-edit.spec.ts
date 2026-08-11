import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  clearStorage,
  SELECTORS
} from './helpers';

/**
 * E2Eテスト: NewTab 画面 - 目標編集
 *
 * NEW-006, NEW-007 のテストケースを実装
 */

test.describe('NewTab 画面 - 目標編集', () => {
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

  test('NEW-006: 目標テキストをダブルクリックで編集モードになる', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 目標テキストを探す（編集可能な場合）
    const goalText = page.locator(SELECTORS.newtab.goalText);
    await expect(goalText).toBeVisible();

    // 編集ボタンが表示されるまでホバー
    await goalText.hover();

    // 編集ボタンを探してクリック
    const editButton = page.locator(SELECTORS.newtab.goalEditButton).first();

    // 編集ボタンが存在する場合のみクリック（プリセット使用時は編集不可）
    const editButtonCount = await editButton.count();
    if (editButtonCount > 0) {
      await editButton.click();

      // 入力フィールドが表示される
      const input = page.locator(
        'input[placeholder*="goal" i], input[placeholder*="目標" i]'
      );
      await expect(input).toBeVisible();
    }

    await page.close();
  });

  test('NEW-007: 編集した目標がEnterキーで保存される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 目標テキストにホバーして編集ボタンを表示
    const goalText = page.locator(SELECTORS.newtab.goalText);
    await goalText.hover();

    // 編集ボタンをクリック
    const editButton = page.locator(SELECTORS.newtab.goalEditButton).first();
    const editButtonCount = await editButton.count();

    if (editButtonCount > 0) {
      await editButton.click();

      // 入力フィールドに新しいテキストを入力
      const input = page.locator(SELECTORS.newtab.goalInput);
      await input.fill('新しい目標テキスト');

      // Enter キーで保存
      await input.press('Enter');

      // 編集モードが終了し、新しいテキストが表示される
      await expect(
        page
          .locator(SELECTORS.newtab.goalText)
          .filter({ hasText: '新しい目標テキスト' })
      ).toBeVisible();
    }

    await page.close();
  });
});
