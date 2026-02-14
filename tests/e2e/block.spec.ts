import { test, expect } from './fixtures/extension';
import { openNewTab, openOptions, openExternalSite } from './helpers/pages';
import { setStorageData, clearStorage } from './helpers/storage';
import { TEST_DOMAINS, SELECTORS } from './helpers/constants';

/**
 * E2E Tests: サイトブロック機能
 *
 * ブロックリストへの追加・削除、Pauseトグル、declarativeNetRequestによるリダイレクトをテスト
 */

test.describe('Block - ブロック機能', () => {
  test.beforeEach(async ({ context }) => {
    const page = await context.newPage();
    await clearStorage(page);
    await page.close();
  });

  test('BLOCK-001: ブロックリストに追加したサイトが newtab.html にリダイレクト', async ({
    context,
    extensionId
  }) => {
    // ブロックリストにexample.comを追加
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
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
    await page.close();

    // ブロックルールが適用されるまで待機
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロック対象サイトにアクセス
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    // newtab.html にリダイレクトされることを確認
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 5000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-002: ワイルドカードで指定したサブドメインがブロックされる', async ({
    context,
    extensionId
  }) => {
    // ワイルドカードでブロックリストに追加
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: `*.${TEST_DOMAINS.example}`,
          isWildcard: true,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ]
    });
    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サブドメインにアクセス
    const blockedPage = await openExternalSite(
      context,
      `https://sub.${TEST_DOMAINS.example}`
    );

    // newtab.html にリダイレクトされることを確認
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 5000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-003: ブロックリストから削除したサイトにアクセスできる', async ({
    context,
    extensionId
  }) => {
    // 最初はブロックリストに追加
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
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
    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロックリストから削除
    const page2 = await context.newPage();
    await setStorageData(page2, 'settings', {
      language: 'en',
      paused: false,
      blockList: []
    });
    await page2.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセスできることを確認
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    // newtab.html にリダイレクトされないことを確認
    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).not.toContain('newtab.html');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);

    await unblockedPage.close();
  });

  test('BLOCK-004: Pause トグルで全ブロックが一時停止される', async ({
    context,
    extensionId
  }) => {
    // ブロックリストに追加
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
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
    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Pauseを有効化
    const page2 = await context.newPage();
    await setStorageData(page2, 'settings', {
      language: 'en',
      paused: true,
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
    await page2.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセスできることを確認
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).not.toContain('newtab.html');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);

    await unblockedPage.close();
  });

  test('BLOCK-005: Pause 解除後、通常のブロック動作に戻る', async ({
    context,
    extensionId
  }) => {
    // Pauseを有効化した状態で開始
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: true,
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
    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Pauseを解除
    const page2 = await context.newPage();
    await setStorageData(page2, 'settings', {
      language: 'en',
      paused: false,
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
    await page2.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロックされることを確認
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 5000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-006: 無効化したブロックアイテムはブロックされない', async ({
    context,
    extensionId
  }) => {
    // enabled: false でブロックアイテムを追加
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: false // 無効化
        }
      ]
    });
    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセスできることを確認
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).not.toContain('newtab.html');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);

    await unblockedPage.close();
  });

  test('BLOCK-007: 有効化したブロックアイテムがブロックされる', async ({
    context,
    extensionId
  }) => {
    // 最初は無効化
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: false
        }
      ]
    });
    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 有効化
    const page2 = await context.newPage();
    await setStorageData(page2, 'settings', {
      language: 'en',
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true // 有効化
        }
      ]
    });
    await page2.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロックされることを確認
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 5000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-008: declarativeNetRequest でリダイレクトが実行される', async ({
    context,
    extensionId
  }) => {
    // ブロックリストに追加
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
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
    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // declarativeNetRequest ルールを確認
    const rulesPage = await context.newPage();
    const rules = await rulesPage.evaluate(async () => {
      return chrome.declarativeNetRequest.getDynamicRules();
    });

    // ルールが存在することを確認
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].action.type).toBe('redirect');
    expect(rules[0].action.redirect?.extensionPath).toBe('/newtab.html');

    await rulesPage.close();
  });

  test('BLOCK-009: ブロック時に lastBlockedDomain がポップアップ用に記録される', async ({
    context,
    extensionId
  }) => {
    // ブロックリストに追加
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
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
    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロック対象サイトにアクセス
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 5000 });

    // lastBlockedDomain が記録されたことを確認
    await new Promise((resolve) => setTimeout(resolve, 500));
    const lastBlocked = await blockedPage.evaluate(async () => {
      const result = await chrome.storage.local.get('lastBlockedDomain');
      return result.lastBlockedDomain;
    });

    expect(lastBlocked).toBe(TEST_DOMAINS.example);

    await blockedPage.close();
  });

  test('BLOCK-010: ブロック回数がカウントされる', async ({
    context,
    extensionId
  }) => {
    // ブロックリストに追加
    const page = await context.newPage();
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
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

    // Analytics データ初期化
    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロック対象サイトに2回アクセス
    const blockedPage1 = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage1.waitForURL(`**newtab.html**`, { timeout: 5000 });
    await blockedPage1.close();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const blockedPage2 = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage2.waitForURL(`**newtab.html**`, { timeout: 5000 });

    // ブロック回数を確認
    await new Promise((resolve) => setTimeout(resolve, 500));
    const analytics = await blockedPage2.evaluate(async () => {
      const result = await chrome.storage.local.get('analytics');
      return result.analytics;
    });

    const today = new Date().toISOString().slice(0, 10);
    expect(analytics.dailyStats[today].blockCount).toBeGreaterThanOrEqual(2);
    expect(
      analytics.siteStats[TEST_DOMAINS.example].blockCount
    ).toBeGreaterThanOrEqual(2);

    await blockedPage2.close();
  });
});
