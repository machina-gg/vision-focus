import { test, expect } from './fixtures/extension';
import { openExternalSite, openOptions } from './helpers/pages';
import {
  getTodayActivityViaSW,
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForBlockRules,
  waitForNoBlockRules
} from './helpers/sw';
import {
  clearStorageFromExtension,
  makeActivity,
  makeAppSettings,
  makeSites,
  setSettingsFromExtension,
  setSitesFromExtension,
  readSiteSetting
} from './helpers/storage';
import { TEST_DATA, TEST_DOMAINS, SELECTORS } from './helpers/constants';

test.describe('Interaction - 機能間相互作用', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('INT-003: Schedule 有効中でも Time Limit 未超過ならブロックされない', async ({
    context
  }) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const sites = makeSites([
      {
        domain: TEST_DOMAINS.example,
        block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
      }
    ]);
    const settings = {
      schedules: [
        {
          id: 'schedule1',
          name: 'Block Now',
          enabled: true,
          days: [currentDay],
          startTime: `${String(currentHour).padStart(2, '0')}:00`,
          endTime: `${String(currentHour + 1).padStart(2, '0')}:00`
        }
      ]
    };

    await setupStorageViaSW(context, {
      settings: makeAppSettings(settings),
      sites,
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 30 }]])
    });
    await triggerBlockRuleRecompute(context);

    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

    const allowedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    expect(allowedPage.url()).toContain(TEST_DOMAINS.example);
    await allowedPage.close();

    await setupStorageViaSW(context, {
      settings: makeAppSettings(settings),
      sites,
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 100 }]])
    });
    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    await blockedPage.close();
  });

  test('INT-005: Analytics Opt-Out でも解除後の滞在時間は記録される', async ({
    context
  }) => {
    // 記録は background の一定間隔のタイマーが 1 周してから入るため、既定のテスト時間では足りない
    test.setTimeout(90_000);

    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
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

  test('INT-007: パスワード保護 + ブロック解除 の認証フロー', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      password: {
        enabled: true,
        passwordHash: TEST_DATA.password.validHash
      }
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    await expect(
      optionsPage.locator(SELECTORS.options.itemDomain).first()
    ).toContainText(TEST_DOMAINS.example);

    await optionsPage.locator(SELECTORS.options.deleteButton).first().click();

    const passwordModal = optionsPage.locator(SELECTORS.modal.passwordModal);
    await expect(passwordModal).toBeVisible();

    const passwordInput = passwordModal.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    await passwordInput.fill(TEST_DATA.password.valid);
    await optionsPage.locator(SELECTORS.modal.passwordConfirmButton).click();

    await expect(passwordModal).toBeHidden();
    await expect(optionsPage.locator(SELECTORS.options.listItem)).toHaveCount(
      0
    );

    await expect
      .poll(() => readSiteSetting(optionsPage, TEST_DOMAINS.example, 'rule'))
      .toBeNull();

    await optionsPage.close();
  });
});
