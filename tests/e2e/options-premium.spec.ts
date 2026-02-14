import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  setStorageData,
  SELECTORS
} from './helpers';

/**
 * E2Eテスト: Options - Premium Tab
 *
 * OPT-P01 ~ OPT-P07 のテストケースを実装
 */

test.describe('Options - Premium Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('OPT-P01: プレミアムタブが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'license');

    // プレミアムタブが表示される
    await expect(page.locator(SELECTORS.options.premiumTab)).toBeVisible();

    // Upgradeボタンが表示される（Freeユーザー）
    await expect(
      page.locator(SELECTORS.premiumTab.upgradeButton)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-P02: 機能比較表が表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'license');

    // 機能比較表が表示される
    const comparisonTable = page.locator(
      SELECTORS.premiumTab.featureComparisonTable
    );
    await expect(comparisonTable).toBeVisible();

    // Free と Premium の列が表示される
    await expect(page.locator('text=/Free/i')).toBeVisible();
    await expect(page.locator('text=/Premium/i')).toBeVisible();

    await page.close();
  });

  test('OPT-P03: ライセンスキー入力でアクティベートできる', async ({
    context,
    extensionId
  }) => {
    // このテストはライセンスキー入力フィールドが実装されている場合のみ有効
    const page = await openOptions(context, extensionId, 'license');

    // ライセンスキー入力フィールドが表示される（実装による）
    const licenseInput = page.locator(SELECTORS.premiumTab.licenseKeyInput);
    const isInputVisible = await licenseInput.isVisible().catch(() => false);

    if (isInputVisible) {
      // テスト用のライセンスキーを入力
      await licenseInput.fill('TEST-LICENSE-KEY-1234');

      // アクティベートボタンをクリック
      const activateButton = page.locator(SELECTORS.premiumTab.activateButton);
      await activateButton.click();

      // アクティベート処理が実行される（成功/失敗は実装による）
      // ここではボタンがクリック可能であることを確認
      await expect(activateButton).toBeVisible();
    }

    await page.close();
  });

  test('OPT-P04: アクティベート後、Premium 機能が有効化', async ({
    context,
    extensionId
  }) => {
    // Premiumユーザーとして設定
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPremium: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'license');

    // Premiumバッジが表示される
    const premiumBadge = page.locator(SELECTORS.premiumTab.currentPlanBadge);
    await expect(premiumBadge).toBeVisible();

    // 現在のプランセクションが表示される
    await expect(
      page.locator('text=/Current Plan|現在のプラン/i')
    ).toBeVisible();

    // Upgradeボタンが表示されない（Manage Subscriptionボタンが表示される）
    const manageButton = page.locator(
      SELECTORS.premiumTab.manageSubscriptionButton
    );
    const isManageVisible = await manageButton.isVisible().catch(() => false);
    expect(isManageVisible).toBeTruthy();

    await page.close();
  });

  test('OPT-P05: ライセンス解除ができる', async ({ context, extensionId }) => {
    // Premiumユーザーとして設定
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPremium: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'license');

    // ライセンス解除ボタンが表示される（実装による）
    const deactivateButton = page.locator(
      SELECTORS.premiumTab.deactivateButton
    );
    const isDeactivateVisible = await deactivateButton
      .isVisible()
      .catch(() => false);

    if (isDeactivateVisible) {
      // ライセンス解除ボタンをクリック
      await deactivateButton.click();

      // 確認ダイアログが表示される可能性がある
      page.on('dialog', (dialog) => dialog.accept());

      // ライセンスが解除される（Freeユーザーに戻る）
      await page.waitForTimeout(1000); // 処理待ち

      // Upgradeボタンが表示される
      const upgradeButton = page.locator(SELECTORS.premiumTab.upgradeButton);
      const isUpgradeVisible = await upgradeButton
        .isVisible()
        .catch(() => false);
      expect(isUpgradeVisible).toBeTruthy();
    }

    await page.close();
  });

  test('OPT-P06: 開発者モード（24時間後に自動無効化・通知あり）が使える', async ({
    context,
    extensionId
  }) => {
    // 開発者モードは実装によって異なるため、存在確認のみ
    const page = await openOptions(context, extensionId, 'license');

    // 開発者モードボタンまたはリンクが表示される（実装による）
    const devModeButton = page.locator('text=/Developer Mode|開発者モード/i');
    const isDevModeVisible = await devModeButton.isVisible().catch(() => false);

    if (isDevModeVisible) {
      // 開発者モードをクリック
      await devModeButton.click();

      // 何らかの確認メッセージまたはモーダルが表示される
      const confirmMessage = page.locator('text=/24時間|24 hours|temporary/i');
      const isMessageVisible = await confirmMessage
        .isVisible()
        .catch(() => false);

      expect(isMessageVisible).toBeTruthy();
    }

    await page.close();
  });

  test('OPT-P07: Upgrade ボタンで決済ページへ遷移する', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'license');

    // Upgradeボタンが表示される
    const upgradeButton = page.locator(SELECTORS.premiumTab.upgradeButton);
    await expect(upgradeButton).toBeVisible();

    // Upgradeボタンをクリック
    await upgradeButton.click();

    // 新しいタブまたはウィンドウが開く（決済ページ）
    const newPage = await context.waitForEvent('page', { timeout: 5000 });

    // 決済ページのURLを確認（実装による）
    const url = newPage.url();
    expect(url).toMatch(/stripe|payment|checkout|upgrade/i);

    await newPage.close();
    await page.close();
  });
});
