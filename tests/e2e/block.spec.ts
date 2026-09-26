import { test, expect } from './fixtures/extension';
import { openNewTab, openOptions, openExternalSite } from './helpers/pages';
import {
  getBlockRuleFilters,
  getTodayActivityViaSW,
  waitForBlockRules,
  waitForNoBlockRules
} from './helpers/sw';
import {
  clearStorageFromExtension,
  setSettingsFromExtension,
  setSitesFromExtension
} from './helpers/storage';
import { TEST_DOMAINS, SELECTORS } from './helpers/constants';

test.describe('Block - ブロック機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('BLOCK-001: ブロックリストに追加したサイトが newtab.html にリダイレクト', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-002: ワイルドカードで指定したサブドメインがブロックされる', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://sub.${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('BLOCK-003: ブロックリストから削除したサイトにアクセスできる', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example }
    ]);

    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).not.toContain('newtab.html');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);

    await unblockedPage.close();
  });

  test('BLOCK-004: Pause トグルで全ブロックが一時停止される', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    await setSettingsFromExtension(context, extensionId, {
      paused: true
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

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
    await setSettingsFromExtension(context, extensionId, {
      paused: true
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

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
    // 無効なものだけだとルールが 0 件で再計算の完了を観測できないため、有効なアイテムを目印に添える
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: { enabled: false } },
      { domain: TEST_DOMAINS.reddit, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.reddit]);

    const filters = await getBlockRuleFilters(context);
    expect(filters.some((f) => f.includes(TEST_DOMAINS.example))).toBe(false);

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
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: { enabled: false } }
    ]);

    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

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
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const rulesPage = await context.newPage();
    await rulesPage.goto(`chrome-extension://${extensionId}/options.html`);
    await rulesPage.waitForLoadState('domcontentloaded');
    const rules = await rulesPage.evaluate(async () => {
      return chrome.declarativeNetRequest.getDynamicRules();
    });

    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].action.type).toBe('redirect');
    expect(rules[0].action.redirect?.extensionPath).toBe('/newtab.html');

    await rulesPage.close();
  });

  test('BLOCK-009: ブロック時にリダイレクト先でブロック元ドメインが表示される', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });

    const blockInfo = blockedPage.locator(SELECTORS.newtab.blockInfo);
    await expect(blockInfo).toBeVisible();
    await expect(blockInfo).toContainText(TEST_DOMAINS.example);

    await blockedPage.close();
  });

  test('BLOCK-010: ブロック回数がカウントされる', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const todayBlocks = async () =>
      (await getTodayActivityViaSW(context, TEST_DOMAINS.example))?.blocks ?? 0;

    const blockedPage1 = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage1.waitForURL(`**newtab.html**`, { timeout: 10000 });
    await expect.poll(todayBlocks).toBeGreaterThanOrEqual(1);
    await blockedPage1.close();

    const blockedPage2 = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage2.waitForURL(`**newtab.html**`, { timeout: 10000 });

    await expect.poll(todayBlocks).toBeGreaterThanOrEqual(2);

    await blockedPage2.close();
  });
});
