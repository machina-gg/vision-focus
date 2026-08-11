import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  getStorageData,
  SELECTORS
} from './helpers';

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
    await expect(page.locator(SELECTORS.options.header)).toBeVisible();

    // タイトルが表示される
    await expect(page.locator(SELECTORS.options.title)).toBeVisible();

    // タブナビゲーションが表示される
    await expect(page.locator(SELECTORS.options.tabsNav)).toBeVisible();

    await page.close();
  });

  test('OPT-002: タブ切り替えが正常に動作する', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);

    // Styles タブをクリック
    const stylesTab = page.locator(SELECTORS.options.stylesTab);
    await stylesTab.click();

    // Styles タブがアクティブになる（見た目のクラスではなく aria-selected で判定）
    await expect(stylesTab).toHaveAttribute('aria-selected', 'true');

    // Analytics タブをクリック
    const analyticsTab = page.locator(SELECTORS.options.analyticsTab);
    await analyticsTab.click();

    // Analytics タブがアクティブになる
    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true');

    // Styles タブは非アクティブになる
    await expect(stylesTab).toHaveAttribute('aria-selected', 'false');

    await page.close();
  });

  test('OPT-003: URL ハッシュでタブ指定ができる（例: #analytics）', async ({
    context,
    extensionId
  }) => {
    // #analytics ハッシュ付きでオプション画面を開く
    const page = await openOptions(context, extensionId, 'analytics');

    // Analytics タブがアクティブになる
    const analyticsTab = page.locator(SELECTORS.options.analyticsTab);
    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true');

    // URL ハッシュが正しく設定されている
    expect(page.url()).toContain('#analytics');

    await page.close();
  });

  test('OPT-004: Analytics Opt-In モーダルが初回訪問時に表示される', async ({
    context,
    extensionId
  }) => {
    // analyticsOptIn が未設定のストレージをセットアップ。
    // AppSettings の必須フィールドを欠くと実装側の参照が壊れるため、
    // ヘルパー経由で完全な形を作る
    const setupPage = await openOptions(context, extensionId);
    await clearStorage(setupPage);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: false // 未設定
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId);

    // Analytics Opt-In モーダルが表示される
    const modal = page.locator(SELECTORS.modal.analyticsOptIn);
    await expect(modal).toBeVisible();

    // Allow ボタンと Deny ボタンが表示される
    const allowButton = page.locator(SELECTORS.modal.analyticsOptInAllow);
    const denyButton = page.locator(SELECTORS.modal.analyticsOptInDeny);
    await expect(allowButton).toBeVisible();
    await expect(denyButton).toBeVisible();

    // Allow ボタンをクリック
    await allowButton.click();

    // モーダルが閉じる
    await expect(modal).not.toBeVisible();

    // ストレージに保存されたことを確認
    const settings = await getStorageData<{
      analyticsOptIn?: { enabled: boolean };
    }>(page, 'settings');

    expect(settings?.analyticsOptIn).toBeDefined();
    expect(settings?.analyticsOptIn?.enabled).toBe(true);

    await page.close();
  });
});
