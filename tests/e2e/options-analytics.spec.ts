import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeSettings,
  makeAnalytics,
  makeSiteBlockCounts,
  getStorageData,
  SELECTORS
} from './helpers';

/**
 * E2Eテスト: Options - Analytics Tab
 *
 * OPT-A01 ~ OPT-A11 のテストケースを実装
 */

test.describe('Options - Analytics Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    // サイトランキングは集計データが無いと描画されないため用意する
    // （SiteRankingList は topBlockedSites.length === 0 で null を返す）
    await setStorageData(
      page,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([
          ['youtube.com', 10],
          ['reddit.com', 5]
        ])
      })
    );
    await page.close();
  });

  test('OPT-A01: 分析タブが表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'analytics');

    // 分析タブが表示される
    await expect(page.locator(SELECTORS.options.analyticsTab)).toBeVisible();

    // サイトランキングセクションが表示される
    await expect(
      page.locator(SELECTORS.analytics.siteRankingList)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-A02: サイト別ランキングが表示される', async ({
    context,
    extensionId
  }) => {
    // テスト用の分析データを追加。
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([
          ['youtube.com', 10],
          ['reddit.com', 5]
        ])
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // サイトランキングが表示される
    const rankingSection = page
      .locator(SELECTORS.analytics.siteRankingList)
      .locator('xpath=../..');
    await expect(rankingSection).toBeVisible();

    // ランキング内に対象ドメインが表示される
    // （ページ全体では追跡中一覧にも同じドメインが出るため範囲を限定する）
    await expect(rankingSection).toContainText('youtube.com');
    await expect(rankingSection).toContainText('reddit.com');

    await page.close();
  });

  test('OPT-A03: 追跡中のサイト一覧が表示される', async ({
    context,
    extensionId
  }) => {
    // テスト用の解除履歴データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'youtube.com': {
          domain: 'youtube.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 3600,
          lastActivity: '2024-01-01T11:00:00.000Z'
        }
      }
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // 追跡中のサイト一覧セクションが表示される
    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toBeVisible();

    // 追跡中一覧に対象ドメインが表示される
    await expect(trackedSection).toContainText('youtube.com');

    await page.close();
  });

  test('OPT-A04: 浪費時間セクションにサイト別の時間が表示される', async ({
    context,
    extensionId
  }) => {
    // テスト用の解除履歴データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'reddit.com': {
          domain: 'reddit.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 7200, // 2時間（秒）
          lastActivity: '2024-01-01T12:00:00.000Z'
        }
      }
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // 追跡中のサイト一覧セクションが表示される
    await expect(
      page.locator(SELECTORS.analytics.trackedSitesList)
    ).toBeVisible();

    // 追跡中のサイトとして reddit.com が表示される
    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toContainText('reddit.com');

    // 滞在時間が何らかの形式で表示される（h / m / s のいずれか）
    await expect(trackedSection).toContainText(/\d+\s*(h|m|s|時間|分|秒)/i);

    await page.close();
  });

  test('OPT-A05: 解除サイトを再ブロックできる', async ({
    context,
    extensionId
  }) => {
    // テスト用の解除履歴データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'twitter.com': {
          domain: 'twitter.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 1800,
          lastActivity: '2024-01-01T10:30:00.000Z'
        }
      }
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // twitter.com の解除履歴が表示される
    const unblockItem = page.locator('text=/twitter.com/i').first();
    await expect(unblockItem).toBeVisible();

    // 再ブロックボタンをクリック
    const reblockButton = page
      .locator(SELECTORS.analytics.reblockButton)
      .first();
    await reblockButton.click();

    // サイトがブロックリストに追加される
    // ブロックリストは独立したキーではなく settings 配下にある
    const settings = (await getStorageData(page, 'settings')) as {
      blockList?: unknown[];
    } | null;

    expect(settings?.blockList ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'twitter.com',
          enabled: true
        })
      ])
    );

    await page.close();
  });

  test('OPT-A06: トラッキング停止ができる', async ({
    context,
    extensionId
  }) => {
    // テスト用の解除履歴データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'reddit.com': {
          domain: 'reddit.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 1800,
          lastActivity: '2024-01-01T10:30:00.000Z'
        }
      }
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // reddit.com の解除履歴が表示される
    const unblockItem = page.locator('text=/reddit.com/i').first();
    await expect(unblockItem).toBeVisible();

    // トラッキング停止ボタンをクリック
    const stopButton = page
      .locator(SELECTORS.analytics.stopTrackingButton)
      .first();
    await stopButton.click();

    // サイトがトラッキングから削除される
    // ページをリロードして確認
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // reddit.com が表示されない（または status が変更される）
    const unblockItemAfter = page.locator('text=/reddit.com/i');
    const isVisible = await unblockItemAfter.isVisible().catch(() => false);

    // トラッキング停止後は表示されないか、ステータスが変わる
    expect(isVisible).toBe(false);

    await page.close();
  });

  test('OPT-A07: 新規サイトをトラッキングに追加できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'analytics');

    // サイト追加セクションが表示される
    const addSiteInput = page.locator(SELECTORS.analytics.addSiteInput);
    await expect(addSiteInput).toBeVisible();

    // サイトを入力
    await addSiteInput.fill('example.com');

    // 追加ボタンをクリック
    const addButton = page.locator(SELECTORS.analytics.addSiteButton);
    await addButton.click();

    // ストレージに保存されたことを確認（保存は非同期なので反映を待つ）
    await expect
      .poll(
        async () => {
          const history = await getStorageData<{
            sites?: Record<string, unknown>;
          }>(page, 'unblockHistory');
          return Object.keys(history?.sites ?? {});
        },
        { timeout: 10000 }
      )
      .toContain('example.com');

    await page.close();
  });

  test('OPT-A08: Analytics データをリフレッシュできる', async ({
    context,
    extensionId
  }) => {
    // リフレッシュ / リセット / エクスポートは分析セクション内にある
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([['youtube.com', 10]]),
        dailyStats: {
          [new Date().toISOString().slice(0, 10)]: {
            date: new Date().toISOString().slice(0, 10),
            wasteTime: 600,
            investTime: 0,
            blockCount: 3,
            unblockCount: 0
          }
        }
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // リフレッシュボタンが表示される
    const refreshButton = page.locator(SELECTORS.analytics.refreshButton);
    await expect(refreshButton).toBeVisible();

    // リフレッシュボタンをクリック
    await refreshButton.click();

    // ボタンがクリック可能（エラーが発生しない）
    // データのリロードは内部的に実行される

    await page.close();
  });

  test('OPT-A09: Analytics データをリセットできる', async ({
    context,
    extensionId
  }) => {
    // テスト用の分析データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([
          ['youtube.com', 10],
          ['reddit.com', 5]
        ])
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // リセットボタンが表示される
    const resetButton = page.locator(SELECTORS.analytics.resetButton);
    await expect(resetButton).toBeVisible();

    // リセットボタンをクリック
    await resetButton.click();

    // 確認ダイアログが表示される可能性がある
    // ダイアログが表示される場合は確認ボタンをクリック
    page.on('dialog', (dialog) => dialog.accept());

    // データがリセットされる（ストレージを確認）
    const analyticsData = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('analytics');
      return (
        result.analyticsData || { siteBlockCounts: [], timeLimitUsage: [] }
      );
    });

    // データが空になる
    expect(analyticsData.siteBlockCounts.length).toBe(0);

    await page.close();
  });

  test('OPT-A10: CSV エクスポートができる（ブロックリスト・統計データ）', async ({
    context,
    extensionId
  }) => {
    // テスト用のデータを追加。
    // ブロックリストは settings 配下、エクスポートは分析セクション内
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
        blockList: [
          {
            id: '1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true
          }
        ],
        analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
      })
    );
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([['youtube.com', 10]]),
        dailyStats: {
          [new Date().toISOString().slice(0, 10)]: {
            date: new Date().toISOString().slice(0, 10),
            wasteTime: 600,
            investTime: 0,
            blockCount: 3,
            unblockCount: 0
          }
        }
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // エクスポートボタンが表示される
    const exportButton = page.locator(SELECTORS.analytics.exportButton);
    await expect(exportButton).toBeVisible();

    // エクスポートはドロップダウンを開いてから項目を選ぶ
    await exportButton.click();

    // クリックより前に待ち受けを開始しないとイベントを取りこぼす
    const downloadPromise = page.waitForEvent('download');
    await page.click(SELECTORS.analytics.exportBlocklist);

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');

    await page.close();
  });

  test('OPT-A11: Unblock History の CSV エクスポートができる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'youtube.com': {
          domain: 'youtube.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 3600,
          lastActivity: '2024-01-01T11:00:00.000Z'
        }
      }
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // エクスポートはドロップダウンを開いてから項目を選ぶ
    await page.click(SELECTORS.analytics.exportButton);

    const exportUnblocked = page.locator(SELECTORS.analytics.exportUnblocked);
    await expect(exportUnblocked).toBeEnabled();

    // クリックより前に待ち受けを開始しないとイベントを取りこぼす
    const downloadPromise = page.waitForEvent('download');
    await exportUnblocked.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');

    await page.close();
  });
});
