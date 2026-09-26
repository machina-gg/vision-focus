import { test, expect } from './fixtures/extension';
import {
  holdUnblockConfirm,
  openExternalSite,
  openOptions,
  openStoragePage,
  toggleAfter
} from './helpers/pages';
import {
  setStorageData,
  setSettings,
  setSites,
  makeActivity,
  makeAppSettings,
  makeSites,
  clearStorageFromExtension,
  readSiteSetting
} from './helpers/storage';
import { SELECTORS, TEST_DOMAINS, UI_TEXT } from './helpers/constants';
import { triggerBlockRuleRecompute, waitForBlockRules } from './helpers/sw';

// hideHomeFeed を有効にした設定には使えない（chrome.i18n の文言を埋め込むため、chrome の無い Node 側では出力が変わる）
import {
  YOUTUBE_SELECTORS,
  generateYouTubeHideCSS
} from '~/lib/youtubeHideStyles';
import type { YouTubeFeatures } from '~/types/site';

const features = (
  overrides: Partial<YouTubeFeatures> = {}
): YouTubeFeatures => ({
  hideShorts: false,
  hideRecommendations: false,
  hideComments: false,
  hideHomeFeed: false,
  ...overrides
});

const YOUTUBE_SITE = 'youtube.com';

test.describe('YouTube - YouTube ブロック機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('YT-001: YouTube Shorts を非表示にできる', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, { paused: false });
    await setSites(page, [
      { domain: YOUTUBE_SITE, youtube: { hideShorts: true } }
    ]);

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // コンテンツスクリプトは storage を読んでから style を注入するため、注入を待つ
    await expect
      .poll(() =>
        youtubePage.evaluate(() => {
          const style = document.getElementById('vision-focus-youtube-blocker');
          return style?.textContent?.includes('a[title="Shorts"]');
        })
      )
      .toBeTruthy();

    await youtubePage.close();
  });

  test('YT-002: YouTube Recommendations（関連動画）を非表示にできる', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, { paused: false });
    await setSites(page, [
      { domain: YOUTUBE_SITE, youtube: { hideRecommendations: true } }
    ]);

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // コンテンツスクリプトは storage を読んでから style を注入するため、注入を待つ
    await expect
      .poll(() =>
        youtubePage.evaluate(() => {
          const style = document.getElementById('vision-focus-youtube-blocker');
          return style?.textContent?.includes('#secondary-inner #related');
        })
      )
      .toBeTruthy();

    await youtubePage.close();
  });

  test('YT-003: YouTube Comments を非表示にできる', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, { paused: false });
    await setSites(page, [
      { domain: YOUTUBE_SITE, youtube: { hideComments: true } }
    ]);

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // コンテンツスクリプトは storage を読んでから style を注入するため、注入を待つ
    await expect
      .poll(() =>
        youtubePage.evaluate(() => {
          const style = document.getElementById('vision-focus-youtube-blocker');
          return style?.textContent?.includes('ytd-comments');
        })
      )
      .toBeTruthy();

    await youtubePage.close();
  });

  test('YT-004: YouTube 完全ブロック（blockAccess）が動作する', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, { paused: false });
    await setSites(page, [{ domain: YOUTUBE_SITE, youtube: {}, block: {} }]);

    await page.close();

    await waitForBlockRules(context, [TEST_DOMAINS.youtube]);

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(youtubePage.url()).toContain('newtab.html');

    await youtubePage.close();
  });

  test('YT-006: アクセスブロックが無効なら Time Limit 超過でも画面を隠さない', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    const youtubeFeatures = features({ hideShorts: true });

    await setSettings(page, { paused: false });
    await setSites(page, [{ domain: YOUTUBE_SITE, youtube: youtubeFeatures }]);

    await setStorageData(
      page,
      'activity',
      makeActivity([[YOUTUBE_SITE, { seconds: 10 }]])
    );

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // コンテンツスクリプトは storage を読んでから style を注入するため、注入を待つ
    await expect
      .poll(() =>
        youtubePage.evaluate(() => {
          const style = document.getElementById('vision-focus-youtube-blocker');
          return style?.textContent?.includes('a[title="Shorts"]');
        })
      )
      .toBeTruthy();

    expect(youtubePage.url()).not.toContain('newtab.html');
    expect(new URL(youtubePage.url()).hostname).toBe(TEST_DOMAINS.youtube);

    const injectedCss = await youtubePage.evaluate(() => {
      const style = document.getElementById('vision-focus-youtube-blocker');
      return style?.textContent ?? null;
    });
    expect(injectedCss).toBe(generateYouTubeHideCSS(youtubeFeatures));

    await youtubePage.close();
  });

  test('YT-007: YouTube 設定変更が即座に反映される', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    const initialSettings = features();

    await setSettings(page, { paused: false });
    await setSites(page, [{ domain: YOUTUBE_SITE, youtube: initialSettings }]);

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // style 要素が無い間は textContent が undefined で未注入でも通ってしまうため、先に注入を待つ
    const styleContent = () =>
      youtubePage.evaluate(() => {
        const style = document.getElementById('vision-focus-youtube-blocker');
        return style ? (style.textContent ?? '') : null;
      });

    await expect.poll(styleContent).not.toBeNull();

    expect(await styleContent()).toBe(generateYouTubeHideCSS(initialSettings));

    // page.evaluate はメインワールドで実行され chrome.storage を参照できないため、拡張機能ページ経由で更新する
    const updatePage = await openStoragePage(context, extensionId);
    await setSettings(updatePage, { paused: false });
    await setSites(updatePage, [
      { domain: YOUTUBE_SITE, youtube: { hideShorts: true } }
    ]);
    await updatePage.close();

    await expect
      .poll(styleContent)
      .toContain(YOUTUBE_SELECTORS.shortsSidebarTab);

    await youtubePage.close();
  });

  test('YT-009: Hide Shorts + Time Limit 同時設定時に両方が機能する', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, { paused: false });
    await setSites(page, [
      {
        domain: YOUTUBE_SITE,
        youtube: { hideShorts: true },
        block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
      }
    ]);

    await setStorageData(
      page,
      'activity',
      makeActivity([[YOUTUBE_SITE, { seconds: 30 }]])
    );

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // コンテンツスクリプトは storage を読んでから style を注入するため、注入を待つ
    await expect
      .poll(() =>
        youtubePage.evaluate(() => {
          const style = document.getElementById('vision-focus-youtube-blocker');
          return style?.textContent ?? '';
        })
      )
      .toContain(YOUTUBE_SELECTORS.shortsSidebarTab);

    expect(youtubePage.url()).not.toContain('newtab.html');
    expect(new URL(youtubePage.url()).hostname).toBe(TEST_DOMAINS.youtube);

    await youtubePage.close();
  });

  test('YT-010: blockAccess と Time Limit の併用（超過後にブロック）', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, { paused: false });
    await setSites(page, [
      {
        domain: YOUTUBE_SITE,
        youtube: {},
        block: { timeLimit: { type: 'daily', limitSeconds: 60 } }
      }
    ]);

    await setStorageData(
      page,
      'activity',
      makeActivity([[YOUTUBE_SITE, { seconds: 120 }]])
    );

    await page.close();

    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.youtube]);

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(youtubePage.url()).toContain('newtab.html');

    await youtubePage.close();
  });
  test('YT-011: YouTube ブロックの有効化を OFF にすると確認が出て、長押しで解除される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openStoragePage(context, extensionId);
    await setStorageData(setupPage, 'settings', makeAppSettings());
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: YOUTUBE_SITE, youtube: {} }])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const masterToggle = toggleAfter(
      page.getByRole('heading', { name: UI_TEXT.youtube.enable })
    );
    await expect(masterToggle).toHaveAttribute('aria-checked', 'true');

    await masterToggle.click();

    const dialog = page.locator(SELECTORS.modal.unblockConfirm);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(TEST_DOMAINS.youtube);
    await expect(masterToggle).toHaveAttribute('aria-checked', 'true');

    await holdUnblockConfirm(page);

    await expect(masterToggle).toHaveAttribute('aria-checked', 'false');
    await expect
      .poll(() => readSiteSetting(page, YOUTUBE_SITE, 'youtube'))
      .toBeNull();

    await page.close();
  });
});
