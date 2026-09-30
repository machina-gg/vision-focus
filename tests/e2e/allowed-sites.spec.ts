import { TRACKER_CONFIG } from '~/constants/limits';

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
  getTodayActivityViaSW,
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

  test.describe('ALLOW-004: 許可サイトの「記録する」と今日の行', () => {
    test('OFF なら見ていても許可サイトの行も親の行も増えない', async ({
      context
    }) => {
      // 記録は background の一定間隔のタイマーが 1 周してから入るため、既定のテスト時間では足りない
      test.setTimeout(90_000);

      await setupStorageViaSW(context, {
        settings: makeAppSettings(),
        sites: makeSites([
          { domain: TEST_DOMAINS.youtube, block: {} },
          { domain: ALLOWED_HOST, allow: { recordTime: false } },
          { domain: TEST_DOMAINS.example }
        ])
      });
      await waitForAllowRules(context, [ALLOWED_HOST]);

      const page = await openExternalSite(context, `https://${ALLOWED_HOST}`);
      expect(page.url()).toContain(ALLOWED_HOST);
      // 記録しないことは、記録のタイマーが何周か回るまで待つ以外に確かめられない
      await page.waitForTimeout(TRACKER_CONFIG.RECORDING_INTERVAL_MS * 3);

      // 同じタブで追跡中のサイトへ移り、その行が増えたら許可サイトを見ていた間の記録は済んでいる
      await page.goto(`https://${TEST_DOMAINS.example}`);
      await expect
        .poll(
          async () =>
            (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
              ?.seconds ?? 0,
          { timeout: 60_000 }
        )
        .toBeGreaterThan(0);

      expect(await getTodayActivityViaSW(context, ALLOWED_HOST)).toBeNull();
      expect(
        await getTodayActivityViaSW(context, TEST_DOMAINS.youtube)
      ).toBeNull();

      await page.close();
    });

    test('ON なら許可サイトの行に入り、親の行には入らない', async ({
      context
    }) => {
      test.setTimeout(90_000);

      await setupStorageViaSW(context, {
        settings: makeAppSettings(),
        sites: makeSites([
          { domain: TEST_DOMAINS.youtube, block: {} },
          { domain: ALLOWED_HOST, allow: { recordTime: true } }
        ])
      });
      await waitForAllowRules(context, [ALLOWED_HOST]);

      const page = await openExternalSite(context, `https://${ALLOWED_HOST}`);
      expect(page.url()).toContain(ALLOWED_HOST);

      await expect
        .poll(
          async () =>
            (await getTodayActivityViaSW(context, ALLOWED_HOST))?.seconds ?? 0,
          { timeout: 60_000 }
        )
        .toBeGreaterThan(0);

      expect(
        await getTodayActivityViaSW(context, TEST_DOMAINS.youtube)
      ).toBeNull();

      await page.close();
    });
  });
});
