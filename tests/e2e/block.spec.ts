import { test, expect } from './fixtures/extension';
import { openNewTab, openOptions, openExternalSite } from './helpers/pages';
import {
  getBlockRuleFilters,
  getStorageViaSW,
  waitForBlockRules,
  waitForNoBlockRules
} from './helpers/sw';
import {
  clearStorageFromExtension,
  makeAnalytics,
  setStorageDataFromExtension,
  setSettingsFromExtension
} from './helpers/storage';
import { TEST_DOMAINS, SELECTORS } from './helpers/constants';

/**
 * E2E Tests: サイトブロック機能
 *
 * ブロックリストへの追加・削除、Pauseトグル、declarativeNetRequestによるリダイレクトをテスト
 */

test.describe('Block - ブロック機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('BLOCK-001: ブロックリストに追加したサイトが newtab.html にリダイレクト', async ({
    context,
    extensionId
  }) => {
    // ブロックリストにexample.comを追加
    await setSettingsFromExtension(context, extensionId, {
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

    // ブロックルールが反映されるまで待つ（固定時間では足りないことがある）
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // ブロック対象サイトにアクセス
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    // newtab.html にリダイレクトされることを確認
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-002: ワイルドカードで指定したサブドメインがブロックされる', async ({
    context,
    extensionId
  }) => {
    // ワイルドカードでブロックリストに追加
    await setSettingsFromExtension(context, extensionId, {
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

    // ワイルドカードは `||example.com` のルールになる（先頭の *. は落ちる）
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // サブドメインにアクセス
    const blockedPage = await openExternalSite(
      context,
      `https://sub.${TEST_DOMAINS.example}`
    );

    // newtab.html にリダイレクトされることを確認
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-003: ブロックリストから削除したサイトにアクセスできる', async ({
    context,
    extensionId
  }) => {
    // 最初はブロックリストに追加
    await setSettingsFromExtension(context, extensionId, {
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

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // ブロックリストから削除
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      blockList: []
    });

    // 削除がルールに反映される（載っていたものが外れる）まで待つ
    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

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
    await setSettingsFromExtension(context, extensionId, {
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

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // Pauseを有効化
    await setSettingsFromExtension(context, extensionId, {
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

    // Pause 中はルールが 1 件も残らない
    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

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
    await setSettingsFromExtension(context, extensionId, {
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

    // ⚠ Pause 中はルールが 1 件も作られないため、ここで待っても観測できる
    //    変化は無い。解除後にルールが載ることが唯一の関門になる

    // Pauseを解除
    await setSettingsFromExtension(context, extensionId, {
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

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // ブロックされることを確認
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-006: 無効化したブロックアイテムはブロックされない', async ({
    context,
    extensionId
  }) => {
    // enabled: false でブロックアイテムを追加する。
    // ⚠ 有効なアイテムを 1 件添える。無効なものだけだとルールが 0 件になり、
    //    「無効だから載らない」と「まだ再計算されていない」を区別できない
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: false // 無効化
        },
        {
          id: '2',
          domain: TEST_DOMAINS.reddit,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true // 再計算が走ったことの目印
        }
      ]
    });

    // 有効なアイテムが載った時点で、無効なアイテムも判定済みになっている
    await waitForBlockRules(context, [TEST_DOMAINS.reddit]);

    const filters = await getBlockRuleFilters(context);
    expect(filters.some((f) => f.includes(TEST_DOMAINS.example))).toBe(false);

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
    await setSettingsFromExtension(context, extensionId, {
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

    // ⚠ 無効なうちはルールが 1 件も作られないため、ここで待っても観測できる
    //    変化は無い。有効化後にルールが載ることが唯一の関門になる

    // 有効化
    await setSettingsFromExtension(context, extensionId, {
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

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // ブロックされることを確認
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-008: declarativeNetRequest でリダイレクトが実行される', async ({
    context,
    extensionId
  }) => {
    // ブロックリストに追加
    await setSettingsFromExtension(context, extensionId, {
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

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // declarativeNetRequest ルールを確認
    const rulesPage = await context.newPage();
    await rulesPage.goto(`chrome-extension://${extensionId}/options.html`);
    await rulesPage.waitForLoadState('domcontentloaded');
    const rules = await rulesPage.evaluate(async () => {
      return chrome.declarativeNetRequest.getDynamicRules();
    });

    // ルールが存在することを確認
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].action.type).toBe('redirect');
    expect(rules[0].action.redirect?.extensionPath).toBe('/newtab.html');

    await rulesPage.close();
  });

  // 実装が動いていないため保留（#351）。
  // DNR のリダイレクトとブロック回数の加算は動くが、
  // chrome.storage.session の lastBlockedDomain が空のままで、
  // 情報バナー（newtab-block-info）が一度も表示されない。
  test.fixme('BLOCK-009: ブロック時にリダイレクト先でブロック元ドメインが表示される', async ({
    context,
    extensionId
  }) => {
    // ブロックリストに追加
    await setSettingsFromExtension(context, extensionId, {
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

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // ブロック対象サイトにアクセス
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });

    // ブロック元のドメインが情報バナーに表示される。
    // 実装は chrome.storage.session の lastBlockedDomain を経由するが、
    // 表示と同時に消すため、storage を後から読んでも取れない（src/newtab.tsx）
    const blockInfo = blockedPage.locator(SELECTORS.newtab.blockInfo);
    await expect(blockInfo).toBeVisible();
    await expect(blockInfo).toContainText(TEST_DOMAINS.example);

    await blockedPage.close();
  });

  test('BLOCK-010: ブロック回数がカウントされる', async ({
    context,
    extensionId
  }) => {
    // ブロックリストに追加
    await setSettingsFromExtension(context, extensionId, {
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
    await setStorageDataFromExtension(
      context,
      extensionId,
      'analytics',
      makeAnalytics()
    );

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // 記録は background が非同期に書くため、読み出しは SW 経由で待つ。
    // この値を増やすのはブロックされたナビゲーションだけ
    // （src/background/listeners/navigationTracking.ts）
    const siteBlockCount = async () => {
      const analytics = await getStorageViaSW(context, 'analytics');
      return analytics?.siteBlockCounts[TEST_DOMAINS.example]?.count ?? 0;
    };

    // ブロック対象サイトに2回アクセス。
    // ⚠ 1 回目の記録を待ってから 2 回目に進む。記録は読み出してから書き戻す
    //    ため、重なると片方の加算が消える
    const blockedPage1 = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage1.waitForURL(`**newtab.html**`, { timeout: 10000 });
    await expect.poll(siteBlockCount).toBeGreaterThanOrEqual(1);
    await blockedPage1.close();

    const blockedPage2 = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage2.waitForURL(`**newtab.html**`, { timeout: 10000 });

    // サイト別の回数は siteBlockCounts[domain].count に入る
    await expect.poll(siteBlockCount).toBeGreaterThanOrEqual(2);

    // 日次の集計にも同じ回数が入る。
    // サイト別の回数より後に書かれるため、これも待つ
    const today = new Date().toISOString().slice(0, 10);
    await expect
      .poll(async () => {
        const analytics = await getStorageViaSW(context, 'analytics');
        return analytics?.dailyStats[today]?.blockCount ?? 0;
      })
      .toBeGreaterThanOrEqual(2);

    await blockedPage2.close();
  });
});
