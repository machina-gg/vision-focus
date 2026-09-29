import { test, expect } from './fixtures/extension';
import { openExternalSite, openOptions, toggleAfter } from './helpers/pages';
import {
  clearStorageFromExtension,
  makeActivity,
  makeAppSettings,
  makeSites,
  readSiteSetting,
  SITE_ROW_MISSING
} from './helpers/storage';
import { TEST_DOMAINS, UI_TEXT } from './helpers/constants';
import {
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForAllowRules,
  waitForBlockRules
} from './helpers/sw';

const ALLOWED_HOST = `music.${TEST_DOMAINS.youtube}`;

test.describe('Allow - 許可サイト', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('ALLOW-001: 許可サイトは開け、親の他のホストはブロック画面へ移る', async ({
    context
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        { domain: TEST_DOMAINS.youtube, block: {} },
        { domain: ALLOWED_HOST, allow: {} }
      ])
    });

    await waitForBlockRules(context, [TEST_DOMAINS.youtube]);
    await waitForAllowRules(context, [ALLOWED_HOST]);

    const allowedPage = await openExternalSite(
      context,
      `https://${ALLOWED_HOST}`
    );
    await allowedPage.waitForLoadState('domcontentloaded');
    expect(allowedPage.url()).not.toContain('newtab.html');
    expect(allowedPage.url()).toContain(ALLOWED_HOST);
    await allowedPage.close();

    const blockedPage = await openExternalSite(
      context,
      `https://www.${TEST_DOMAINS.youtube}`
    );
    await blockedPage.waitForURL('**newtab.html**', { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');
    await blockedPage.close();
  });

  test('ALLOW-002: 親の時間制限を使い切っても許可サイトは開ける', async ({
    context
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        {
          domain: TEST_DOMAINS.youtube,
          block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
        },
        { domain: ALLOWED_HOST, allow: {} }
      ]),
      activity: makeActivity([[TEST_DOMAINS.youtube, { seconds: 100 }]])
    });

    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.youtube]);
    await waitForAllowRules(context, [ALLOWED_HOST]);

    const allowedPage = await openExternalSite(
      context,
      `https://${ALLOWED_HOST}`
    );
    await allowedPage.waitForLoadState('domcontentloaded');
    expect(allowedPage.url()).not.toContain('newtab.html');
    expect(allowedPage.url()).toContain(ALLOWED_HOST);
    await allowedPage.close();
  });

  test('ALLOW-003: 規則なしの m.youtube.com を追跡した状態で YouTube 設定を有効にすると、理由が出て保存されない', async ({
    context,
    extensionId
  }) => {
    const trackedChild = `m.${TEST_DOMAINS.youtube}`;
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([{ domain: trackedChild }])
    });

    const page = await openOptions(context, extensionId, 'blocklist');

    const masterToggle = toggleAfter(
      page.getByRole('heading', { name: UI_TEXT.youtube.enable })
    );
    await expect(masterToggle).toHaveAttribute('aria-checked', 'false');

    await masterToggle.click();

    await expect(page.getByTestId('youtube-error')).toContainText(trackedChild);
    await expect(masterToggle).toHaveAttribute('aria-checked', 'false');
    expect(await readSiteSetting(page, TEST_DOMAINS.youtube, 'youtube')).toBe(
      SITE_ROW_MISSING
    );

    await page.close();
  });
});
