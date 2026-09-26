import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  clearStorage,
  makeActivity,
  setStorageData,
  setSessionStorageData,
  SELECTORS,
  UI_TEXT
} from './helpers';

test.describe('NewTab 画面 - ブロック情報表示', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await openNewTab(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('NEW-009: ブロックされたサイトから遷移時、ブロック情報が表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setSessionStorageData(setupPage, 'lastBlockedDomain', 'example.com');
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([
        ['example.com', { blocks: 3 }],
        ['example.com', { blocks: 2 }, 10]
      ])
    );
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    const blockBanner = page
      .locator(SELECTORS.newtab.blockInfo)
      .filter({ hasText: 'example.com' });
    await expect(blockBanner.first()).toBeVisible();

    await expect(blockBanner.first()).toContainText(UI_TEXT.blockCount.long(5));

    await page.close();
  });

  test('NEW-010: ブロックサイトリストが表示される', async ({
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
        ['example.com', { blocks: 1 }],
        ['example.com', { blocks: 1 }, 30]
      ])
    );
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    const toggle = page.locator(SELECTORS.newtab.blockedSitesToggle);
    await expect(toggle).toBeVisible();

    await toggle.click();
    const blockedSitesList = page.locator(SELECTORS.newtab.blockedSiteDomain);
    await expect(blockedSitesList.first()).toBeVisible();
    await expect(blockedSitesList.first()).toContainText('example.com');
    await expect(page.getByText(UI_TEXT.blockCount.short(2))).toBeVisible();

    await page.close();
  });

  test('NEW-012: Time Limit 超過からの遷移時、専用メッセージが表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openNewTab(context, extensionId);
    await setSessionStorageData(setupPage, 'lastBlockedDomain', 'youtube.com');
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([['youtube.com', { blocks: 3 }]])
    );
    await setupPage.close();

    const url = `chrome-extension://${extensionId}/newtab.html?reason=time_limit_exceeded`;
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');

    const timeLimitMessage = page.locator(SELECTORS.newtab.blockInfoMessage);
    await expect(timeLimitMessage.first()).toBeVisible();

    await page.close();
  });
});
