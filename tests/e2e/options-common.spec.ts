import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  getStorageData,
  SELECTORS
} from './helpers';

test.describe('Options 画面（共通機能）', () => {
  test.beforeEach(async ({ context, extensionId }) => {
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

    await expect(page.locator(SELECTORS.options.header)).toBeVisible();

    await expect(page.locator(SELECTORS.options.title)).toBeVisible();

    await expect(page.locator(SELECTORS.options.tabsNav)).toBeVisible();

    await page.close();
  });

  test('OPT-002: タブ切り替えが正常に動作する', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);

    const stylesTab = page.locator(SELECTORS.options.stylesTab);
    await stylesTab.click();

    await expect(stylesTab).toHaveAttribute('aria-selected', 'true');

    const analyticsTab = page.locator(SELECTORS.options.analyticsTab);
    await analyticsTab.click();

    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true');

    await expect(stylesTab).toHaveAttribute('aria-selected', 'false');

    await page.close();
  });

  test('OPT-003: URL ハッシュでタブ指定ができる（例: #analytics）', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'analytics');

    const analyticsTab = page.locator(SELECTORS.options.analyticsTab);
    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true');

    expect(page.url()).toContain('#analytics');

    await page.close();
  });

  test('OPT-004: Analytics Opt-In モーダルが初回訪問時に表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await clearStorage(setupPage);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: false
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId);

    const modal = page.locator(SELECTORS.modal.analyticsOptIn);
    await expect(modal).toBeVisible();

    const allowButton = page.locator(SELECTORS.modal.analyticsOptInAllow);
    const denyButton = page.locator(SELECTORS.modal.analyticsOptInDeny);
    await expect(allowButton).toBeVisible();
    await expect(denyButton).toBeVisible();

    await allowButton.click();

    await expect(modal).not.toBeVisible();

    const settings = await getStorageData(page, 'settings');

    expect(settings?.analyticsOptIn).toBeDefined();
    expect(settings?.analyticsOptIn?.enabled).toBe(true);

    await page.close();
  });
});
