import type { Page } from '@playwright/test';

import { test, expect } from './fixtures/extension';
import {
  openOptions,
  openExternalSite,
  holdUnblockConfirm
} from './helpers/pages';
import {
  clearStorageFromExtension,
  setStorageDataFromExtension,
  setSettingsFromExtension,
  setSitesFromExtension,
  getStorageData,
  makeActivity,
  makeAppSettings,
  makeSites,
  readSiteSetting
} from './helpers/storage';
import {
  getStorageViaSW,
  getTodayActivityViaSW,
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForBlockRules
} from './helpers/sw';
import { TEST_DOMAINS, SELECTORS } from './helpers/constants';

async function readActivityDates(page: Page): Promise<string[] | null> {
  const log = await getStorageData(page, 'activity');
  return log ? Object.keys(log) : null;
}

test.describe('Analytics - アナリティクス機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('AN-001: サイト別ブロック回数が記録される', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const todayBlocks = async () =>
      (await getTodayActivityViaSW(context, TEST_DOMAINS.example))?.blocks ?? 0;

    for (let i = 0; i < 3; i++) {
      const blockedPage = await openExternalSite(
        context,
        `https://${TEST_DOMAINS.example}`
      );
      await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
      await expect.poll(todayBlocks).toBeGreaterThanOrEqual(i + 1);
      await blockedPage.close();
    }

    expect(await todayBlocks()).toBeGreaterThanOrEqual(3);
  });

  test('AN-002: ブロックリストから外したサイトは追跡中に残る', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    await optionsPage.locator(SELECTORS.options.deleteButton).first().click();
    await expect(
      optionsPage.locator(SELECTORS.modal.unblockConfirm)
    ).toBeVisible();
    await holdUnblockConfirm(optionsPage);
    await expect(optionsPage.locator(SELECTORS.options.listItem)).toHaveCount(
      0
    );

    await expect
      .poll(async () => {
        const sites = await getStorageData(optionsPage, 'sites');
        const site = sites?.[TEST_DOMAINS.example];
        return site ? { tracked: true, block: site.block } : null;
      })
      .toEqual({ tracked: true, block: null });

    await optionsPage.close();
  });

  test('AN-003: 解除サイトの滞在時間が Heartbeat で記録される', async ({
    context
  }) => {
    // 記録は background の一定間隔のタイマーが 1 周してから入るため、既定のテスト時間では足りない
    test.setTimeout(90_000);

    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        paused: false,
        analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
      }),
      sites: makeSites([{ domain: TEST_DOMAINS.example }])
    });

    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');

    // 拡張機能のページを開くと前面のタブが入れ替わり heartbeat が止まるため、SW 経由で読む
    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.seconds ?? 0,
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);

    await externalPage.close();
  });

  test('AN-004: 追跡中サイトのサブドメインで見ている時間はサイトの行に記録される', async ({
    context
  }) => {
    test.setTimeout(90_000);

    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        paused: false,
        analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
      }),
      sites: makeSites([{ domain: TEST_DOMAINS.example }])
    });

    const externalPage = await openExternalSite(
      context,
      `https://www.${TEST_DOMAINS.example}`
    );
    await externalPage.waitForLoadState('domcontentloaded');

    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.seconds ?? 0,
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);

    expect(
      await getTodayActivityViaSW(context, `www.${TEST_DOMAINS.example}`)
    ).toBeNull();

    await externalPage.close();
  });

  test('AN-005: Analytics Opt-In モーダルで許可/拒否を選択できる', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: null
    });

    const optionsPage = await openOptions(context, extensionId, 'analytics');

    const modal = optionsPage.locator('[role="dialog"], .modal');
    await modal.waitFor({ state: 'visible', timeout: 3000 });

    const allowButton = modal.locator(
      'button:has-text("Allow"), button:has-text("許可")'
    );
    await allowButton.click();

    await expect
      .poll(async () => {
        const settings = await getStorageViaSW(context, 'settings');
        return settings?.analyticsOptIn?.enabled ?? null;
      })
      .toBe(true);

    await optionsPage.close();
  });

  test('AN-006: Opt-Out でもブロック回数の集計は続く', async ({ context }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        paused: false,
        analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
      }),
      sites: makeSites([{ domain: TEST_DOMAINS.example, block: {} }])
    });
    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });

    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.blocks ?? 0
      )
      .toBeGreaterThan(0);

    await blockedPage.close();
  });

  test('AN-007: Analytics データをリセットできる', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    await setStorageDataFromExtension(
      context,
      extensionId,
      'activity',
      makeActivity([
        [TEST_DOMAINS.reddit, { seconds: 300, blocks: 10 }, 0],
        [TEST_DOMAINS.reddit, { blocks: 5, unblocks: 1 }, 30]
      ])
    );

    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.reddit }
    ]);

    const optionsPage = await openOptions(context, extensionId, 'analytics');

    expect(await readActivityDates(optionsPage)).toHaveLength(2);

    const resetButton = optionsPage.locator(SELECTORS.analytics.resetButton);
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    const resetConfirmButton = optionsPage.locator(
      SELECTORS.analytics.resetConfirmButton
    );
    await expect(resetConfirmButton).toBeVisible();
    await resetConfirmButton.click();

    await expect.poll(() => readActivityDates(optionsPage)).toBeNull();

    await expect
      .poll(async () =>
        Object.keys((await getStorageData(optionsPage, 'sites')) ?? {})
      )
      .toEqual([TEST_DOMAINS.reddit]);

    await optionsPage.close();
  });

  test('AN-010: Opt-Out でも解除したサイトの追跡と解除の記録は残る', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    await optionsPage.locator(SELECTORS.options.deleteButton).first().click();
    await expect(
      optionsPage.locator(SELECTORS.modal.unblockConfirm)
    ).toBeVisible();
    await holdUnblockConfirm(optionsPage);
    await expect(optionsPage.locator(SELECTORS.options.listItem)).toHaveCount(
      0
    );

    await expect
      .poll(() => readSiteSetting(optionsPage, TEST_DOMAINS.example, 'block'))
      .toBeNull();

    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.unblocks ?? 0
      )
      .toBe(1);

    await optionsPage.close();
  });
});
