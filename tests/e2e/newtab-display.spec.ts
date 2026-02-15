import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  clearStorage,
  setStorageData
} from './helpers';

/**
 * E2Eテスト: NewTab 画面 - 基本表示
 *
 * NEW-001, NEW-002, NEW-003, NEW-008 のテストケースを実装
 */

test.describe('NewTab 画面 - 基本表示', () => {
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

  test('NEW-001: 新規タブを開くとダッシュボードが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // ダッシュボードコンテナが表示される
    const container = page.locator('.newtab-container');
    await expect(container).toBeVisible();

    // 目標テキストが表示される
    await expect(page.locator('h1')).toBeVisible();

    // 設定ボタンが表示される（右下）
    const settingsButton = page
      .locator('button')
      .filter({ hasText: /Settings|設定/i })
      .last();
    await expect(settingsButton).toBeVisible();

    await page.close();
  });

  test('NEW-002: プリセット設定済み時、背景画像が表示される', async ({
    context,
    extensionId
  }) => {
    // プリセット付きのストレージをセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // コンテナに背景スタイルが適用されている
    const container = page.locator('.newtab-container');
    await expect(container).toBeVisible();

    // オーバーレイが表示される（プリセット設定時に表示される半透明オーバーレイ）
    const overlay = page.locator('.absolute.inset-0.bg-black\\/30');
    await expect(overlay).toBeVisible();

    await page.close();
  });

  test('NEW-003: 目標テキストが中央に表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 目標テキストが表示される
    const goalText = page
      .locator('h1')
      .filter({ hasText: /Focus on what matters/i });
    await expect(goalText).toBeVisible();
    await expect(goalText).toContainText('Focus on what matters');

    // サブテキストが表示される
    const subText = page.locator('p').filter({ hasText: /Stay productive/i });
    await expect(subText).toBeVisible();

    await page.close();
  });

  test('NEW-008: プリセット未設定時、シンプルなブロックページUIが表示', async ({
    context,
    extensionId
  }) => {
    // プリセットを空にしたストレージをセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: {
        goalText: 'Focus on what matters',
        subText: 'Stay productive'
      },
      presets: [], // プリセットなし
      activePresetId: null
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // VisionFocus タイトルが表示される
    await expect(
      page.locator('h1').filter({ hasText: 'VisionFocus' })
    ).toBeVisible();

    // セットアップCTAが表示される
    const setupButton = page
      .locator('button')
      .filter({ hasText: /Create|作成/i });
    await expect(setupButton).toBeVisible();

    await page.close();
  });
});
