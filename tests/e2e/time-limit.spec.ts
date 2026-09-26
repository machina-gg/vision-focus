import { test, expect } from './fixtures/extension';
import { openExternalSite, openOptions, openPopup } from './helpers/pages';
import {
  makeAppSettings,
  makeActivity,
  clearStorageFromExtension,
  makeSites
} from './helpers/storage';
import { TEST_DOMAINS } from './helpers/constants';
import {
  getBlockRuleFilters,
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForBlockRules,
  waitForNoBlockRules
} from './helpers/sw';

test.describe('TimeLimit - Time Limit 機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('TL-003: Time Limit 超過時に newtab.html へリダイレクトされる', async ({
    context
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        {
          domain: TEST_DOMAINS.example,
          block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
        }
      ]),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 100 }]])
    });

    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');

    await blockedPage.close();
  });

  test('TL-006: 残り時間がポップアップで表示される', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        {
          domain: TEST_DOMAINS.example,
          block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
        }
      ]),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 30 }]])
    });

    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    const popupPage = await openPopup(context, extensionId);

    // ポップアップを開くとポップアップ自身がアクティブタブになるため、サイトのタブを前面に戻して reload する
    await sitePage.bringToFront();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');

    // reload で拾えなくても 10 秒ポーリングで拾えるよう timeout を長めに取る
    await expect(
      popupPage.locator('[data-testid="time-limit-badge"]')
    ).toBeVisible({ timeout: 15_000 });

    await popupPage.close();
    await sitePage.close();
  });

  test('TL-007: Time Limit の残り時間がブロックリストに表示される', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        {
          domain: TEST_DOMAINS.example,
          block: { timeLimit: { type: 'daily', limitSeconds: 300 } }
        }
      ]),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 60 }]])
    });

    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    const badge = optionsPage.locator('[data-testid="time-limit-badge"]');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-state', 'remaining');

    await optionsPage.close();
  });

  test('TL-008: Pause 有効中は Time Limit 超過してもブロックされない', async ({
    context
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        paused: true
      }),
      sites: makeSites([
        {
          domain: TEST_DOMAINS.example,
          block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
        }
      ]),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 100 }]])
    });

    await triggerBlockRuleRecompute(context);

    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

    const page = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    expect(page.url()).toContain(TEST_DOMAINS.example);
    expect(page.url()).not.toContain('newtab.html');
    await page.close();
  });

  test('TL-009: Daily の使用実績は日付が変わるとリセットされる', async ({
    context
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        {
          domain: TEST_DOMAINS.example,
          block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
        },
        { domain: TEST_DOMAINS.reddit, block: {} }
      ]),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 100 }, 1]])
    });

    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.reddit]);
    const filters = await getBlockRuleFilters(context);
    expect(filters.some((f) => f.includes(TEST_DOMAINS.example))).toBe(false);

    const page = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    expect(page.url()).toContain(TEST_DOMAINS.example);
    await page.close();
  });

  test('TL-011: 複数サイトで異なる Time Limit が同時に動作する', async ({
    context
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        {
          domain: TEST_DOMAINS.example,
          block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
        },
        {
          domain: TEST_DOMAINS.reddit,
          block: { timeLimit: { type: 'daily', limitSeconds: 300 } }
        }
      ]),
      activity: makeActivity([
        [TEST_DOMAINS.example, { seconds: 70 }],
        [TEST_DOMAINS.reddit, { seconds: 10 }]
      ])
    });

    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    await blockedPage.close();

    await waitForNoBlockRules(context, [TEST_DOMAINS.reddit]);
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.reddit}`
    );
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.reddit);
    expect(unblockedPage.url()).not.toContain('newtab.html');
    await unblockedPage.close();
  });
});
