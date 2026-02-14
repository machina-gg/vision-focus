import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  setStorageData,
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
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
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
    // テスト用の分析データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'analyticsData', {
      siteBlockCounts: [
        { domain: 'youtube.com', count: 10 },
        { domain: 'reddit.com', count: 5 }
      ],
      timeLimitUsage: []
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // サイトランキングが表示される
    await expect(
      page.locator(SELECTORS.analytics.siteRankingList)
    ).toBeVisible();

    // youtube.com が表示される
    await expect(page.locator('text=/youtube.com/i')).toBeVisible();

    // reddit.com が表示される
    await expect(page.locator('text=/reddit.com/i')).toBeVisible();

    await page.close();
  });

  test('OPT-A03: Unblock History（ブロック解除サイト）が表示される', async ({
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

    // Unblock Historyセクションが表示される
    await expect(
      page.locator(SELECTORS.analytics.unblockHistory)
    ).toBeVisible();

    // youtube.com が表示される
    await expect(page.locator('text=/youtube.com/i')).toBeVisible();

    await page.close();
  });

  test('OPT-A04: ブロック解除サイトの滞在時間が表示される', async ({
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

    // Unblock Historyセクションが表示される
    await expect(
      page.locator(SELECTORS.analytics.unblockHistory)
    ).toBeVisible();

    // reddit.com が表示される
    const unblockItem = page.locator('text=/reddit.com/i');
    await expect(unblockItem).toBeVisible();

    // 滞在時間が表示される（フォーマットは実装依存）
    // 2時間が何らかの形で表示される
    const timeText = page.locator('text=/2h|120m|7200/i');
    const isTimeVisible = await timeText.isVisible().catch(() => false);

    // 時間表示が存在することを確認（フォーマットは問わない）
    expect(isTimeVisible).toBeTruthy();

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

    // サイトがブロックリストに追加される（ストレージを確認）
    const blockList = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('blockList');
      return result.blockList || [];
    });

    expect(blockList).toEqual(
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

    // ストレージに保存されたことを確認
    const unblockHistory = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('unblockHistory');
      return result.unblockHistory || { sites: {} };
    });

    expect(unblockHistory.sites['example.com']).toBeDefined();

    await page.close();
  });

  test('OPT-A08: Analytics データをリフレッシュできる', async ({
    context,
    extensionId
  }) => {
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
    await setStorageData(setupPage, 'analyticsData', {
      siteBlockCounts: [
        { domain: 'youtube.com', count: 10 },
        { domain: 'reddit.com', count: 5 }
      ],
      timeLimitUsage: []
    });
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
      const result = await chrome.storage.local.get('analyticsData');
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
    // テスト用のデータを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'blockList', [
      {
        id: '1',
        domain: 'youtube.com',
        isWildcard: false,
        createdAt: new Date().toISOString(),
        enabled: true
      }
    ]);
    await setStorageData(setupPage, 'analyticsData', {
      siteBlockCounts: [{ domain: 'youtube.com', count: 10 }],
      timeLimitUsage: []
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // エクスポートボタンが表示される
    const exportButton = page.locator(SELECTORS.analytics.exportButton);
    await expect(exportButton).toBeVisible();

    // エクスポートボタンをクリック（ダウンロードが発生）
    // ダウンロードイベントをリスン
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();

    // ダウンロードが開始される
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');

    await page.close();
  });

  test('OPT-A11: Premium ユーザーは Unblock History の CSV エクスポート可能', async ({
    context,
    extensionId
  }) => {
    // Premium設定
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPremium: true,
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

    // Unblock History エクスポートボタンが表示される（Premiumユーザーのみ）
    const exportButton = page
      .locator('button:has-text("CSV"), button:has-text("Export")')
      .filter({ has: page.locator('text=/Unblock|解除/i') });

    // Premiumユーザーの場合、エクスポートボタンが有効
    const isVisible = await exportButton.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();

    if (isVisible) {
      // エクスポートボタンをクリック
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();

      // ダウンロードが開始される
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    }

    await page.close();
  });
});
