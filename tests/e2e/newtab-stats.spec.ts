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

/**
 * E2Eテスト: NewTab 画面 - 統計カード
 *
 * NEW-004, NEW-013 のテストケースを実装
 */

test.describe('NewTab 画面 - 統計カード', () => {
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

  test('NEW-004: ミニ統計カード（ブロック回数）が表示される', async ({
    context,
    extensionId
  }) => {
    // 今日のブロック数は追跡中のサイトの今日の activity から出る。
    // 昨日の行も置き、今日の分だけを数えていることを見る
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

    // ブロック回数カードが表示される
    const blockCountCard = page
      .locator('text=/Today.*Blocks|今日のブロック/i')
      .first();
    await expect(blockCountCard).toBeVisible();

    // toContainText だと 13 / 30 でも通るため、表示そのものと突き合わせる
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
    // ブロックリストに古い日付のドメインを追加
    const setupPage = await openNewTab(context, extensionId);
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - 10); // 10日前

    await setSettings(setupPage, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });
    // ブロック日数の起点はブロックリストに入れた時刻（block.addedAt）
    await setSites(setupPage, [
      { domain: 'example.com', block: { addedAt: createdDate.toISOString() } }
    ]);

    await setSessionStorageData(setupPage, 'lastBlockedDomain', 'example.com');
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // Blocking Days カードが表示される
    const blockingDaysCard = page.locator('text=/Blocking Days|ブロック日数/i');
    await expect(blockingDaysCard.first()).toBeVisible();

    // 日数が表示される（10日前に登録したので 10。単位付きの表示文言と突き合わせる）
    const daysCount = page.locator(SELECTORS.newtab.miniStats.blockingDays);
    await expect(daysCount.first()).toBeVisible();
    await expect(daysCount.first()).toHaveText(UI_TEXT.blockingDays(10));

    await page.close();
  });
});
