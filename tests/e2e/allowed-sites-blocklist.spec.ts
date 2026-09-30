import type { Page } from '@playwright/test';

import { test, expect } from './fixtures/extension';
import { openExternalSite, openOptions } from './helpers/pages';
import {
  clearStorageFromExtension,
  makeActivity,
  makeAppSettings,
  makeSites,
  readSiteSetting,
  SITE_ROW_MISSING
} from './helpers/storage';
import { SELECTORS, TEST_DOMAINS, UI_TEXT } from './helpers/constants';
import {
  getTodayActivityViaSW,
  setupStorageViaSW,
  waitForAllowRules,
  waitForBlockRules
} from './helpers/sw';

const OPTIONS = SELECTORS.options;
const MUSIC_HOST = `music.${TEST_DOMAINS.youtube}`;
const OLD_REDDIT_HOST = `old.${TEST_DOMAINS.reddit}`;

async function addAllowedSite(page: Page, input: string): Promise<void> {
  await page.locator(OPTIONS.allowedSiteInput).fill(input);
  await page.locator(OPTIONS.allowedSiteAddButton).click();
}

function allowedRow(page: Page, domain: string) {
  return page.locator(OPTIONS.allowedSiteItem).filter({
    has: page.locator(OPTIONS.allowedSiteDomain).getByText(domain, {
      exact: true
    })
  });
}

test.describe('Allow - ブロックリストタブの「許可サイト」節', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('ALLOW-007: 「許可サイト」節から追加でき、行に「<ブロック> の例外」、ブロックの行と YouTube の節に件数が出る', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        { domain: TEST_DOMAINS.youtube, block: {} },
        { domain: TEST_DOMAINS.reddit, block: {} }
      ])
    });

    const page = await openOptions(context, extensionId, 'blocklist');

    await addAllowedSite(page, MUSIC_HOST);
    await expect(allowedRow(page, MUSIC_HOST)).toHaveCount(1);
    await expect(page.locator(OPTIONS.allowedSiteInput)).toHaveValue('');
    await addAllowedSite(page, OLD_REDDIT_HOST);
    await expect(allowedRow(page, OLD_REDDIT_HOST)).toHaveCount(1);

    // 確認を挟まずに保存まで進む（ブロックを外す操作と違って確認のダイアログは開かない）
    await expect(page.locator(SELECTORS.modal.unblockConfirm)).toHaveCount(0);
    expect(await readSiteSetting(page, MUSIC_HOST, 'rule')).toEqual({
      kind: 'allow',
      recordTime: false
    });
    await waitForAllowRules(context, [MUSIC_HOST, OLD_REDDIT_HOST]);

    await expect(
      allowedRow(page, MUSIC_HOST).locator(OPTIONS.allowedSiteNote)
    ).toHaveText(UI_TEXT.allowedSites.exceptionOf(TEST_DOMAINS.youtube));
    await expect(
      allowedRow(page, MUSIC_HOST).locator(OPTIONS.allowedSiteRecordToggle)
    ).toHaveAttribute('aria-checked', 'false');
    await expect(
      allowedRow(page, OLD_REDDIT_HOST).locator(OPTIONS.allowedSiteNote)
    ).toHaveText(UI_TEXT.allowedSites.exceptionOf(TEST_DOMAINS.reddit));

    const redditItem = page.locator(OPTIONS.listItem).filter({
      has: page.locator(OPTIONS.itemDomain).getByText(TEST_DOMAINS.reddit, {
        exact: true
      })
    });
    await expect(redditItem.locator(OPTIONS.itemAllowedCount)).toHaveText(
      UI_TEXT.allowedSites.count(1)
    );
    await expect(page.locator(OPTIONS.youtubeAllowedCount)).toHaveText(
      UI_TEXT.allowedSites.count(1)
    );

    await page.close();
  });

  test('ALLOW-008: 追加できないホストは理由が出て入力が残り、上にブロックの無いホストは追加できる', async ({
    context,
    extensionId
  }) => {
    const trackedChild = `m.${TEST_DOMAINS.twitter}`;
    const unblockedHost = `docs.${TEST_DOMAINS.reddit}`;
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        { domain: TEST_DOMAINS.youtube, block: {} },
        { domain: TEST_DOMAINS.example },
        { domain: trackedChild }
      ])
    });

    const page = await openOptions(context, extensionId, 'blocklist');
    const input = page.locator(OPTIONS.allowedSiteInput);
    const error = page.locator(OPTIONS.allowedSiteError);

    const rejected: [string, string][] = [
      [TEST_DOMAINS.youtube, UI_TEXT.allowedSites.alreadyBlocked],
      [TEST_DOMAINS.example, UI_TEXT.allowedSites.alreadyTracked],
      [
        TEST_DOMAINS.twitter,
        UI_TEXT.allowedSites.containsTracked(TEST_DOMAINS.twitter, trackedChild)
      ]
    ];
    for (const [domain, reason] of rejected) {
      await addAllowedSite(page, domain);
      await expect(error).toHaveText(reason);
      await expect(input).toHaveValue(domain);
    }
    expect(await readSiteSetting(page, TEST_DOMAINS.twitter, 'rule')).toBe(
      SITE_ROW_MISSING
    );
    expect(await readSiteSetting(page, TEST_DOMAINS.youtube, 'rule')).toEqual(
      expect.objectContaining({ kind: 'block' })
    );

    await addAllowedSite(page, unblockedHost);
    await expect(
      allowedRow(page, unblockedHost).locator(OPTIONS.allowedSiteNote)
    ).toHaveText(UI_TEXT.allowedSites.noBlock);
    await expect(error).toHaveCount(0);
    await expect(input).toHaveValue('');

    await page.close();
  });

  test('ALLOW-009: 「時間を記録する」を ON にすると、その後の滞在が記録される', async ({
    context,
    extensionId
  }) => {
    // 記録は background の一定間隔のタイマーが 1 周してから入るため、既定のテスト時間では足りない
    test.setTimeout(90_000);

    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        { domain: TEST_DOMAINS.youtube, block: {} },
        { domain: MUSIC_HOST, allow: { recordTime: false } }
      ])
    });
    await waitForAllowRules(context, [MUSIC_HOST]);

    const options = await openOptions(context, extensionId, 'blocklist');
    const toggle = allowedRow(options, MUSIC_HOST).locator(
      OPTIONS.allowedSiteRecordToggle
    );
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(await readSiteSetting(options, MUSIC_HOST, 'rule')).toEqual({
      kind: 'allow',
      recordTime: true
    });
    await options.close();

    const page = await openExternalSite(context, `https://${MUSIC_HOST}`);
    expect(page.url()).toContain(MUSIC_HOST);

    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, MUSIC_HOST))?.seconds ?? 0,
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);
    expect(
      await getTodayActivityViaSW(context, TEST_DOMAINS.youtube)
    ).toBeNull();

    await page.close();
  });

  test('ALLOW-010: 削除で登録と記録が消え、そのホストを開いていたタブがブロック画面に置き換わる', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings(),
      sites: makeSites([
        { domain: TEST_DOMAINS.youtube, block: {} },
        { domain: MUSIC_HOST, allow: {} }
      ]),
      activity: makeActivity([[MUSIC_HOST, { seconds: 120 }]])
    });
    await waitForBlockRules(context, [TEST_DOMAINS.youtube]);
    await waitForAllowRules(context, [MUSIC_HOST]);

    const allowedPage = await openExternalSite(
      context,
      `https://${MUSIC_HOST}`
    );
    expect(allowedPage.url()).not.toContain('newtab.html');
    expect(allowedPage.url()).toContain(MUSIC_HOST);
    // 種の記録が入っていることを先に確かめる（無いまま「消えた」と判定しないため）
    expect(
      (await getTodayActivityViaSW(context, MUSIC_HOST))?.seconds
    ).toBeGreaterThan(0);

    const options = await openOptions(context, extensionId, 'blocklist');
    await allowedRow(options, MUSIC_HOST)
      .locator(OPTIONS.allowedSiteRemove)
      .click();

    await expect(allowedRow(options, MUSIC_HOST)).toHaveCount(0);
    await expect(options.locator(SELECTORS.modal.unblockConfirm)).toHaveCount(
      0
    );
    expect(await readSiteSetting(options, MUSIC_HOST, 'rule')).toBe(
      SITE_ROW_MISSING
    );
    await expect
      .poll(async () => await getTodayActivityViaSW(context, MUSIC_HOST))
      .toBeNull();

    await allowedPage.waitForURL('**newtab.html**', { timeout: 10_000 });
    expect(allowedPage.url()).toContain('newtab.html');

    await allowedPage.close();
    await options.close();
  });
});
