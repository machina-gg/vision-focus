import { test, expect } from './fixtures/extension';
import { openOptions, setupTestStorage,
  clearStorage, setStorageData } from './helpers';

/**
 * E2Eテスト: Options 画面（共通機能）
 *
 * OPT-001 ~ OPT-004 のテストケースを実装
 */

test.describe('Options 画面（共通機能）', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('OPT-001: オプション画面が正常に開く', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);

    // ヘッダーが表示される
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // タイトルが表示される
    const title = page.locator('h1').filter({ hasText: /Settings|設定/i });
    await expect(title).toBeVisible();

    // タブナビゲーションが表示される
    const tabsNav = page.locator('nav[aria-label="Tabs"]');
    await expect(tabsNav).toBeVisible();

    await page.close();
  });

  test('OPT-002: タブ切り替えが正常に動作する', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);

    // Styles タブをクリック
    const stylesTab = page
      .locator('button')
      .filter({ hasText: /Styles|スタイル/i });
    await stylesTab.click();

    // Styles タブがアクティブになる
    await expect(stylesTab).toHaveClass(/border-primary-500/);

    // Analytics タブをクリック
    const analyticsTab = page
      .locator('button')
      .filter({ hasText: /Analytics|分析/i });
    await analyticsTab.click();

    // Analytics タブがアクティブになる
    await expect(analyticsTab).toHaveClass(/border-primary-500/);

    // Styles タブは非アクティブになる
    await expect(stylesTab).toHaveClass(/border-transparent/);

    await page.close();
  });

  test('OPT-003: URL ハッシュでタブ指定ができる（例: #analytics）', async ({
    context,
    extensionId
  }) => {
    // #analytics ハッシュ付きでオプション画面を開く
    const page = await openOptions(context, extensionId, 'analytics');

    // Analytics タブがアクティブになる
    const analyticsTab = page
      .locator('button')
      .filter({ hasText: /Analytics|分析/i });
    await expect(analyticsTab).toHaveClass(/border-primary-500/);

    // URL ハッシュが正しく設定されている
    expect(page.url()).toContain('#analytics');

    await page.close();
  });

  test('OPT-004: Analytics Opt-In モーダルが初回訪問時に表示される', async ({
    context,
    extensionId
  }) => {
    // analyticsOptIn が未設定のストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: null // 未設定
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId);

    // Analytics Opt-In モーダルが表示される
    const modal = page
      .locator('.fixed.inset-0')
      .filter({ has: page.locator('text=/Analytics|分析/i') });
    await expect(modal).toBeVisible();

    // Allow ボタンと Deny ボタンが表示される
    const allowButton = page
      .locator('button')
      .filter({ hasText: /Allow|許可/i });
    const denyButton = page
      .locator('button')
      .filter({ hasText: /Deny|拒否|No/i });
    await expect(allowButton).toBeVisible();
    await expect(denyButton).toBeVisible();

    // Allow ボタンをクリック
    await allowButton.click();

    // モーダルが閉じる
    await expect(modal).not.toBeVisible();

    // ストレージに保存されたことを確認
    const settings = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('settings');
      return result.settings;
    });

    expect(settings.analyticsOptIn).toBeDefined();
    expect(settings.analyticsOptIn.enabled).toBe(true);

    await page.close();
  });
});
