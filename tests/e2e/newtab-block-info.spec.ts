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
    // 回数は追跡中のサイトの activity から出るため、ブロックリストに入れておく
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    // lastBlockedDomain は session エリアに保存される
    await setSessionStorageData(setupPage, 'lastBlockedDomain', 'example.com');
    // 回数は今日だけでなく保持期間全体の合計（今日 3 回 + 10 日前 2 回）
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

    // ブロック情報バナーが表示される
    const blockBanner = page
      .locator(SELECTORS.newtab.blockInfo)
      .filter({ hasText: 'example.com' });
    await expect(blockBanner.first()).toBeVisible();

    // ブロック回数はバナーの中に文言ごと出る。
    // ページ全体から数字を探すと、統計カードなど別の場所の「5」でも通る
    await expect(blockBanner.first()).toContainText(UI_TEXT.blockCount.long(5));

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
    // 一覧の回数は保持期間全体の合計（今日 1 回 + 30 日前 1 回）
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

    // ブロックサイトリストのセクションが表示される
    const toggle = page.locator(SELECTORS.newtab.blockedSitesToggle);
    await expect(toggle).toBeVisible();

    // リストは折りたたまれているため、展開してから中身を確認する
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
    // Time Limit 超過でブロックされたドメイン情報をセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setSessionStorageData(setupPage, 'lastBlockedDomain', 'youtube.com');
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([['youtube.com', { blocks: 3 }]])
    );
    await setupPage.close();

    // Time Limit 超過の reason パラメータ付きでページを開く
    const url = `chrome-extension://${extensionId}/newtab.html?reason=time_limit_exceeded`;
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');

    // Time Limit 専用メッセージが表示される
    const timeLimitMessage = page.locator(SELECTORS.newtab.blockInfoMessage);
    await expect(timeLimitMessage.first()).toBeVisible();

    await page.close();
  });
});
