import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  clearStorage,
  setStorageData
} from './helpers';

/**
 * E2Eテスト: NewTab 画面 - ブロック情報表示
 *
 * NEW-009, NEW-010, NEW-012 のテストケースを実装
 */

test.describe('NewTab 画面 - ブロック情報表示', () => {
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

  test('NEW-009: ブロックされたサイトから遷移時、ブロック情報が表示される', async ({
    context,
    extensionId
  }) => {
    // ブロックされたドメイン情報をセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setStorageData(setupPage, 'lastBlockedDomain', 'example.com');
    await setStorageData(setupPage, 'analytics', {
      siteBlockCounts: {
        'example.com': {
          domain: 'example.com',
          count: 5,
          lastBlockedAt: new Date().toISOString()
        }
      },
      timeLimitUsage: {}
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // ブロック情報バナーが表示される
    const blockBanner = page
      .locator('.animate-fade-in, div')
      .filter({ hasText: 'example.com' });
    await expect(blockBanner.first()).toBeVisible();

    // ブロック回数が表示される
    await expect(page.locator('text=/5/i').first()).toBeVisible();

    await page.close();
  });

  test('NEW-010: ブロックサイトリストが表示される', async ({
    context,
    extensionId
  }) => {
    // ブロックリスト付きのストレージをセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // ブロックサイトリストセクションが表示される
    // BlockedSitesList コンポーネントが表示されることを確認
    const blockedSitesList = page.locator('text=/example.com/i');
    await expect(blockedSitesList.first()).toBeVisible();

    await page.close();
  });

  test('NEW-012: Time Limit 超過からの遷移時、専用メッセージが表示される', async ({
    context,
    extensionId
  }) => {
    // Time Limit 超過でブロックされたドメイン情報をセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setStorageData(setupPage, 'lastBlockedDomain', 'youtube.com');
    await setStorageData(setupPage, 'analytics', {
      siteBlockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 3,
          lastBlockedAt: new Date().toISOString()
        }
      },
      timeLimitUsage: {}
    });
    await setupPage.close();

    // Time Limit 超過の reason パラメータ付きでページを開く
    const url = `chrome-extension://${extensionId}/newtab.html?reason=time_limit_exceeded`;
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');

    // Time Limit 専用メッセージが表示される
    const timeLimitMessage = page.locator('text=/time limit|時間制限/i');
    await expect(timeLimitMessage.first()).toBeVisible();

    await page.close();
  });
});
