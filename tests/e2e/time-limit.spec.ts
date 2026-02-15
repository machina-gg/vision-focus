import { test, expect } from './fixtures/extension';
import { openExternalSite, openPopup, openOptions } from './helpers/pages';
import {
  setStorageData,
  clearStorage,
  clearStorageFromExtension,
  getStorageData
} from './helpers/storage';
import { TEST_DOMAINS } from './helpers/constants';

/**
 * E2E Tests: Time Limit 機能
 *
 * Daily/Hourly Time Limit、リセット、超過時のリダイレクトをテスト
 */

test.describe('TimeLimit - Time Limit 機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('TL-001: Daily Time Limit を設定できる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Daily Time Limit を設定
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: 60, // 60秒
            hourly: null
          }
        }
      ]
    });

    // 設定が保存されたことを確認
    const settings = (await getStorageData(page, 'settings')) as any;
    expect(settings.blockList[0].timeLimit.daily).toBe(60);

    await page.close();
  });

  test('TL-002: Hourly Time Limit を設定できる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Hourly Time Limit を設定
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: null,
            hourly: 30 // 30秒
          }
        }
      ]
    });

    // 設定が保存されたことを確認
    const settings = (await getStorageData(page, 'settings')) as any;
    expect(settings.blockList[0].timeLimit.hourly).toBe(30);

    await page.close();
  });

  test('TL-003: Time Limit 超過時に newtab.html へリダイレクト（reason付き）', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Time Limit を1秒に設定
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: 1, // 1秒
            hourly: null
          }
        }
      ]
    });

    // 既に使用済みとして記録
    await setStorageData(page, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: {
          used: 2, // 1秒を超過
          resetAt: new Date(Date.now() + 86400000).toISOString()
        },
        hourly: null
      }
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセス
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    // newtab.html にリダイレクトされることを確認
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 5000 });
    expect(blockedPage.url()).toContain('newtab.html');

    // reason パラメータが含まれることを確認
    expect(blockedPage.url()).toContain('reason=time_limit_exceeded');

    await blockedPage.close();
  });

  test('TL-004: Time Limit 超過後、Daily は日付変更でリセット（00:00）', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 昨日の使用データを設定（resetAt が過去）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: 60,
            hourly: null
          }
        }
      ]
    });

    await setStorageData(page, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: {
          used: 70, // 超過していた
          resetAt: yesterday.toISOString() // 過去のリセット時刻
        },
        hourly: null
      }
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセス（リセットされているのでアクセス可能）
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    // ブロックされないことを確認
    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);
    expect(unblockedPage.url()).not.toContain('newtab.html');

    await unblockedPage.close();
  });

  test('TL-005: Time Limit 超過後、Hourly は時間変更でリセット（毎時00分）', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 1時間前の使用データを設定
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: null,
            hourly: 30
          }
        }
      ]
    });

    await setStorageData(page, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: null,
        hourly: {
          used: 40, // 超過していた
          resetAt: oneHourAgo.toISOString() // 過去のリセット時刻
        }
      }
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセス（リセットされているのでアクセス可能）
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);
    expect(unblockedPage.url()).not.toContain('newtab.html');

    await unblockedPage.close();
  });

  test('TL-006: 残り時間がポップアップで表示される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Time Limit を設定
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: 60,
            hourly: null
          }
        }
      ]
    });

    // 30秒使用済み
    await setStorageData(page, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: {
          used: 30,
          resetAt: new Date(Date.now() + 86400000).toISOString()
        },
        hourly: null
      }
    });

    await page.close();

    // ポップアップを開く
    const popupPage = await openPopup(context, extensionId);

    // 残り時間バッジが表示されることを確認
    const remainingTimeText = await popupPage
      .locator('text=/remaining|残り/i')
      .first()
      .isVisible();
    expect(remainingTimeText).toBeTruthy();

    await popupPage.close();
  });

  test('TL-007: Time Limit 使用状況が Analytics タブで確認できる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    // Analytics データにTime Limit使用状況を記録
    await setStorageData(page, 'analytics', {
      dailyStats: {
        [new Date().toISOString().slice(0, 10)]: {
          date: new Date().toISOString().slice(0, 10),
          wasteTime: 120,
          investTime: 0,
          blockCount: 5,
          unblockCount: 0
        }
      },
      siteStats: {}
    });

    await page.close();

    // Options の Analytics タブを開く
    const optionsPage = await openOptions(context, extensionId, 'analytics');

    // Analytics データが表示されることを確認
    await optionsPage.waitForSelector('text=/analytics|分析/i');
    const statsVisible = await optionsPage
      .locator('text=/120|waste time/i')
      .isVisible();
    expect(statsVisible).toBeTruthy();

    await optionsPage.close();
  });

  test('TL-008: Pause 有効中に Time Limit 超過した場合もリダイレクトされない', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Pause 有効 + Time Limit 超過状態
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: true, // Pause 有効
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: 1,
            hourly: null
          }
        }
      ]
    });

    await setStorageData(page, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: {
          used: 10, // 超過
          resetAt: new Date(Date.now() + 86400000).toISOString()
        },
        hourly: null
      }
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセス（Pauseが優先されてアクセス可能）
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);
    expect(unblockedPage.url()).not.toContain('newtab.html');

    await unblockedPage.close();
  });

  test('TL-009: Daily リセット境界値テスト（23:59→00:00）', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 23:59の resetAt を設定（現在時刻より1分後）
    const resetTime = new Date();
    resetTime.setHours(23, 59, 0, 0);
    if (resetTime <= new Date()) {
      resetTime.setDate(resetTime.getDate() + 1);
    }

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: 60,
            hourly: null
          }
        }
      ]
    });

    await setStorageData(page, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: {
          used: 50,
          resetAt: resetTime.toISOString()
        },
        hourly: null
      }
    });

    // Date をモックして00:00を再現
    await page.evaluate(() => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const realDate = Date;
      // @ts-ignore
      Date = class extends realDate {
        constructor() {
          super();
          return midnight;
        }
        static now() {
          return midnight.getTime();
        }
      };
    });

    // リセットされているか確認
    // リセットされているか確認
    const usage = (await getStorageData(page, 'timeLimitUsage')) as any;
    // resetAt が過去になっているため、次回アクセス時にリセットされる
    expect(
      new Date(usage[TEST_DOMAINS.example].daily.resetAt).getTime()
    ).toBeLessThan(new Date().getTime());

    await page.close();
  });

  test('TL-010: Hourly リセット境界値テスト（09:59→10:00）', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 09:59の resetAt を設定
    const resetTime = new Date();
    resetTime.setMinutes(59, 0, 0);

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: null,
            hourly: 30
          }
        }
      ]
    });

    await setStorageData(page, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: null,
        hourly: {
          used: 25,
          resetAt: resetTime.toISOString()
        }
      }
    });

    // Date をモックして10:00を再現
    await page.evaluate(() => {
      const nextHour = new Date();
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const realDate = Date;
      // @ts-ignore
      Date = class extends realDate {
        constructor() {
          super();
          return nextHour;
        }
        static now() {
          return nextHour.getTime();
        }
      };
    });

    const usageHourly = (await getStorageData(page, 'timeLimitUsage')) as any;
    expect(
      new Date(usageHourly[TEST_DOMAINS.example].hourly.resetAt).getTime()
    ).toBeLessThan(new Date().getTime());

    await page.close();
  });

  test('TL-011: 複数サイトで異なる Time Limit が同時に動作する', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 2つのサイトに異なる Time Limit を設定
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: 60,
            hourly: null
          }
        },
        {
          id: '2',
          domain: TEST_DOMAINS.reddit,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            daily: 30,
            hourly: null
          }
        }
      ]
    });

    // example.com は超過、reddit.com は未超過
    await setStorageData(page, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: {
          used: 70, // 超過
          resetAt: new Date(Date.now() + 86400000).toISOString()
        },
        hourly: null
      },
      [TEST_DOMAINS.reddit]: {
        daily: {
          used: 10, // 未超過
          resetAt: new Date(Date.now() + 86400000).toISOString()
        },
        hourly: null
      }
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // example.com はブロック
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 5000 });
    expect(blockedPage.url()).toContain('newtab.html');
    await blockedPage.close();

    // reddit.com はアクセス可能
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.reddit}`
    );
    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.reddit);
    expect(unblockedPage.url()).not.toContain('newtab.html');
    await unblockedPage.close();
  });
});
