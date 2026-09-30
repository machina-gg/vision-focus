import { test, expect } from './fixtures/extension';
import { openExternalSite } from './helpers/pages';
import {
  clearStorageFromExtension,
  makeAppSettings,
  makeSites
} from './helpers/storage';
import { SELECTORS, TEST_DOMAINS, UI_TEXT } from './helpers/constants';
import {
  getStorageViaSW,
  setupStorageViaSW,
  waitForAllowRules,
  waitForBlockRules
} from './helpers/sw';

const ALLOWED_HOST = `music.${TEST_DOMAINS.youtube}`;

test.describe('Allow - ブロック画面の帯から許可サイトにする', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([{ domain: TEST_DOMAINS.youtube, block: {} }])
    });
    await waitForBlockRules(context, [TEST_DOMAINS.youtube]);
  });

  test('ALLOW-005: 帯のボタンで記録 OFF の許可サイトになり、同じホストは開け、親の他のホストはブロックされたまま', async ({
    context
  }) => {
    const blockedPage = await openExternalSite(
      context,
      `https://${ALLOWED_HOST}`
    );
    await blockedPage.waitForURL('**newtab.html**', { timeout: 10000 });

    const button = blockedPage.locator(SELECTORS.newtab.allowHostButton);
    await expect(button).toHaveText(UI_TEXT.newtab.allowHost(ALLOWED_HOST));

    await button.click();

    await expect(
      blockedPage.locator(SELECTORS.newtab.allowHostDone)
    ).toContainText(UI_TEXT.newtab.allowHostDone(ALLOWED_HOST));
    await expect(
      blockedPage.locator(SELECTORS.newtab.allowHostOpen)
    ).toHaveAttribute('href', `https://${ALLOWED_HOST}/`);

    const sites = await getStorageViaSW(context, 'sites');
    expect(sites?.[ALLOWED_HOST]?.rule).toEqual({
      kind: 'allow',
      recordTime: false
    });
    await waitForAllowRules(context, [ALLOWED_HOST]);

    await blockedPage.locator(SELECTORS.newtab.allowHostOpen).click();
    await blockedPage.waitForURL(`**${ALLOWED_HOST}**`, { timeout: 10000 });
    expect(blockedPage.url()).not.toContain('newtab.html');
    await blockedPage.close();

    const parentPage = await openExternalSite(
      context,
      `https://www.${TEST_DOMAINS.youtube}`
    );
    await parentPage.waitForURL('**newtab.html**', { timeout: 10000 });
    await parentPage.close();
  });

  for (const host of [TEST_DOMAINS.youtube, `www.${TEST_DOMAINS.youtube}`]) {
    test(`ALLOW-006: ブロックした登録そのもの（${host}）がブロックされたときは、帯にボタンが出ない`, async ({
      context
    }) => {
      const blockedPage = await openExternalSite(context, `https://${host}`);
      await blockedPage.waitForURL('**newtab.html**', { timeout: 10000 });

      await expect(
        blockedPage.locator(SELECTORS.newtab.blockInfoMessage)
      ).toHaveText(UI_TEXT.newtab.siteBlocked(host));
      await expect(
        blockedPage.locator(SELECTORS.newtab.allowHostButton)
      ).toHaveCount(0);

      await blockedPage.close();
    });
  }
});
