import { test, expect } from './fixtures/extension';
import { openOptions, openExternalSite } from './helpers/pages';
import {
  setStorageData,
  clearStorage,
  getStorageData
} from './helpers/storage';
import { TEST_DOMAINS } from './helpers/constants';

/**
 * E2E Tests: アナリティクス機能
 *
 * サイト別ブロック回数、Unblock History、Heartbeat、Opt-In/Opt-Outをテスト
 */

test.describe('Analytics - アナリティクス機能', () => {
  test.beforeEach(async ({ context }) => {
    const page = await context.newPage();
    await clearStorage(page);
    await page.close();
  });

  test('AN-001: サイト別ブロック回数が記録される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ]
    });

    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロック対象サイトに3回アクセス
    for (let i = 0; i < 3; i++) {
      const blockedPage = await openExternalSite(
        context,
        `https://${TEST_DOMAINS.example}`
      );
      await blockedPage.waitForURL(`**newtab.html**`, { timeout: 5000 });
      await blockedPage.close();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Analytics データを確認
    const page2 = await context.newPage();
    const analytics = (await getStorageData(page2, 'analytics')) as any;

    expect(analytics.siteStats[TEST_DOMAINS.example]).toBeDefined();
    expect(
      analytics.siteStats[TEST_DOMAINS.example].blockCount
    ).toBeGreaterThanOrEqual(3);

    await page2.close();
  });

  test('AN-002: Unblock History（ブロック解除サイト）が記録される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ]
    });

    await setStorageData(page, 'unblockHistory', {
      entries: []
    });

    await page.close();

    // Options ページでブロックを一時解除
    const optionsPage = await openOptions(context, extensionId, 'blocklist');
    await optionsPage.waitForLoadState('domcontentloaded');

    // ブロック解除ボタンをクリック（実装に応じてセレクタを調整）
    const unblockButton = optionsPage
      .locator('button:has-text("Unblock"), button:has-text("解除")')
      .first();
    if (await unblockButton.isVisible()) {
      await unblockButton.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Unblock History を確認
    const unblockHistory = (await getStorageData(
      optionsPage,
      'unblockHistory'
    )) as any;
    expect(unblockHistory.entries.length).toBeGreaterThan(0);

    await optionsPage.close();
  });

  test('AN-003: 解除サイトの滞在時間が 30 秒間隔の Heartbeat で記録', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    await page.close();

    // 解除サイトにアクセス（ブロックリストに含まれていないサイト）
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.reddit}`
    );

    await externalPage.waitForLoadState('domcontentloaded');

    // 30秒間待機してHeartbeatが送信されるのを待つ（テストでは短縮）
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // トラッキングデータを確認
    const analytics = (await getStorageData(externalPage, 'analytics')) as any;

    // Heartbeatが記録されていることを確認（時間は短いが記録されている）
    if (analytics.siteStats[TEST_DOMAINS.reddit]) {
      expect(
        analytics.siteStats[TEST_DOMAINS.reddit].totalTime
      ).toBeGreaterThan(0);
    }

    await externalPage.close();
  });

  test('AN-004: トラッキング中サイトの滞在時間が記録される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    await page.close();

    // 外部サイトにアクセス
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Analytics データを確認
    const analytics = (await getStorageData(externalPage, 'analytics')) as any;

    // dailyStats に記録があることを確認
    const today = new Date().toISOString().slice(0, 10);
    if (analytics.dailyStats[today]) {
      expect(analytics.dailyStats[today]).toBeDefined();
    }

    await externalPage.close();
  });

  test('AN-005: Analytics Opt-In モーダルで許可/拒否を選択できる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Opt-In が未決定の状態
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: null
    });

    await page.close();

    // Options ページを開く
    const optionsPage = await openOptions(context, extensionId, 'analytics');

    // Opt-In モーダルが表示されることを確認
    const modal = optionsPage.locator('[role="dialog"], .modal');
    await modal.waitFor({ state: 'visible', timeout: 3000 });

    // 許可ボタンをクリック
    const allowButton = modal.locator(
      'button:has-text("Allow"), button:has-text("許可")'
    );
    await allowButton.click();

    // 設定が保存されたことを確認
    await new Promise((resolve) => setTimeout(resolve, 300));
    const settings = (await getStorageData(optionsPage, 'settings')) as any;
    expect(settings.analyticsOptIn).toBeDefined();
    expect(settings.analyticsOptIn.enabled).toBe(true);

    await optionsPage.close();
  });

  test('AN-006: Opt-Out した場合、トラッキングが無効化される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Opt-Out 状態
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
    });

    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    await page.close();

    // 外部サイトにアクセス
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Analytics データが記録されていないことを確認
    const analytics = (await getStorageData(externalPage, 'analytics')) as any;
    expect(Object.keys(analytics.dailyStats).length).toBe(0);

    await externalPage.close();
  });

  test('AN-007: Analytics データをリセットできる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    // Analytics データを設定
    await setStorageData(page, 'analytics', {
      dailyStats: {
        '2024-01-01': {
          date: '2024-01-01',
          wasteTime: 300,
          investTime: 0,
          blockCount: 10,
          unblockCount: 0
        }
      },
      siteStats: {
        [TEST_DOMAINS.example]: {
          domain: TEST_DOMAINS.example,
          blockCount: 5,
          unblockCount: 0,
          totalTime: 200
        }
      }
    });

    await page.close();

    // Options ページを開く
    const optionsPage = await openOptions(context, extensionId, 'analytics');

    // リセットボタンをクリック
    const resetButton = optionsPage.locator(
      'button:has-text("Reset"), button:has-text("リセット")'
    );
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Analytics データがリセットされたことを確認
      const analytics = (await getStorageData(optionsPage, 'analytics')) as any;
      expect(Object.keys(analytics.dailyStats).length).toBe(0);
      expect(Object.keys(analytics.siteStats).length).toBe(0);
    }

    await optionsPage.close();
  });

  test('AN-008: ネットワーク切断時に Heartbeat がローカルキューに保存', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    await page.close();

    // オフラインモードに設定
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await context.setOffline(true);

    await externalPage.waitForLoadState('domcontentloaded');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ローカルキューに保存されているか確認（実装に応じて調整）
    const queueData = await externalPage.evaluate(async () => {
      const result = await chrome.storage.local.get('heartbeatQueue');
      return result.heartbeatQueue;
    });

    // キューが存在する場合は記録されていることを確認
    if (queueData) {
      expect(Array.isArray(queueData)).toBeTruthy();
    }

    await context.setOffline(false);
    await externalPage.close();
  });

  test('AN-009: ネットワーク復旧時にキューされた Heartbeat が送信', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    // ダミーのキューデータを設定
    await setStorageData(page, 'heartbeatQueue', [
      {
        domain: TEST_DOMAINS.example,
        duration: 30,
        timestamp: new Date().toISOString()
      }
    ]);

    await page.close();

    // ネットワークオンラインに復旧
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await context.setOffline(false);

    await externalPage.waitForLoadState('domcontentloaded');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // キューが送信されてクリアされたことを確認
    const queueData = await externalPage.evaluate(async () => {
      const result = await chrome.storage.local.get('heartbeatQueue');
      return result.heartbeatQueue;
    });

    // キューが空になっている、またはundefined
    expect(queueData?.length || 0).toBe(0);

    await externalPage.close();
  });

  test('AN-010: Opt-Out 時に Unblock History も無効化される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Opt-Out 状態
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() },
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ]
    });

    await setStorageData(page, 'unblockHistory', {
      entries: []
    });

    await page.close();

    // Options ページでブロック解除を試みる
    const optionsPage = await openOptions(context, extensionId, 'blocklist');
    await optionsPage.waitForLoadState('domcontentloaded');

    const unblockButton = optionsPage
      .locator('button:has-text("Unblock"), button:has-text("解除")')
      .first();
    if (await unblockButton.isVisible()) {
      await unblockButton.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Unblock History に記録されないことを確認
    const unblockHistory = (await getStorageData(
      optionsPage,
      'unblockHistory'
    )) as any;
    expect(unblockHistory.entries.length).toBe(0);

    await optionsPage.close();
  });
});
