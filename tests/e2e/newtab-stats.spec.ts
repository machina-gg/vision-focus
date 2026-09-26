import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  clearStorage,
  setSettings,
  setSites,
  setSessionStorageData,
  setStorageData,
  makeActivity,
  SELECTORS,
  UI_TEXT
} from './helpers';

test.describe('NewTab 画面 - 統計カード', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await openNewTab(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('NEW-004: ミニ統計カード（ブロック回数）が表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([
        ['example.com', { blocks: 3 }],
        ['example.com', { blocks: 5 }, 1]
      ])
    );
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    const blockCountCard = page
      .locator('text=/Today.*Blocks|今日のブロック/i')
      .first();
    await expect(blockCountCard).toBeVisible();

    const blockCount = page.locator(SELECTORS.newtab.miniStats.blockCount);
    await expect(blockCount).toHaveCount(1);
    await expect(blockCount).toBeVisible();
    await expect(blockCount).toHaveText('3');

    await page.close();
  });

  test('NEW-013: ブロック日数（Blocking Days）が正しく表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openNewTab(context, extensionId);
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - 10);

    await setSettings(setupPage, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });
    await setSites(setupPage, [
      { domain: 'example.com', block: { addedAt: createdDate.toISOString() } }
    ]);

    await setSessionStorageData(setupPage, 'lastBlockedDomain', 'example.com');
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    const blockingDaysCard = page.locator('text=/Blocking Days|ブロック日数/i');
    await expect(blockingDaysCard.first()).toBeVisible();

    const daysCount = page.locator(SELECTORS.newtab.miniStats.blockingDays);
    await expect(daysCount.first()).toBeVisible();
    await expect(daysCount.first()).toHaveText(UI_TEXT.blockingDays(10));

    await page.close();
  });
});
