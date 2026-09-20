import { test, expect } from './fixtures/extension';
import { openExternalSite, openStoragePage } from './helpers/pages';
import {
  setStorageData,
  setSettings,
  makeAnalytics,
  makeYouTubeSettings,
  clearStorage,
  clearStorageFromExtension,
  getStorageData
} from './helpers/storage';
import { TEST_DOMAINS } from './helpers/constants';

// 非表示 CSS の SSOT。テストから期待値を組み立てるために実装と同じ関数を使う。
// ⚠ hideHomeFeed を有効にした設定には使えない。そのルールだけが chrome.i18n の
// 文言を埋め込むため、chrome の無い Node 側では出力が変わる（src/lib/i18n.ts）
import { generateYouTubeHideCSS } from '~/lib/youtubeHideStyles';
import type { YouTubeSettings } from '~/types/storage';

/**
 * E2E Tests: YouTube ブロック機能
 *
 * YouTube Shorts、Recommendations、Comments の非表示、完全ブロック、Time Limitをテスト
 */

test.describe('YouTube - YouTube ブロック機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('YT-001: YouTube Shorts を非表示にできる', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // YouTube Shorts を非表示に設定
    await setSettings(page, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: false,
        hideShorts: true,
        hideRecommendations: false,
        hideComments: false,
        timeLimit: null
      })
    });

    await page.close();

    // YouTube にアクセス
    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // Shorts が非表示になる CSS が適用されているか確認
    // コンテンツスクリプトは storage を読んでから style を注入するため、
    // 注入が終わるまで待つ
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

    await setSettings(page, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: false,
        hideShorts: false,
        hideRecommendations: true,
        hideComments: false,
        timeLimit: null
      })
    });

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // Recommendations が非表示になる CSS が適用されているか確認
    const recsHidden = await youtubePage.evaluate(() => {
      const style = document.getElementById('vision-focus-youtube-blocker');
      return style?.textContent?.includes('#secondary-inner #related');
    });

    expect(recsHidden).toBeTruthy();

    await youtubePage.close();
  });

  test('YT-003: YouTube Comments を非表示にできる', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: false,
        hideShorts: false,
        hideRecommendations: false,
        hideComments: true,
        timeLimit: null
      })
    });

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // Comments が非表示になる CSS が適用されているか確認
    // コンテンツスクリプトは storage を読んでから style を注入するため、
    // 注入が終わるまで待つ
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

    // YouTube を完全ブロック
    await setSettings(page, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: true,
        hideShorts: false,
        hideRecommendations: false,
        hideComments: false,
        timeLimit: null
      })
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // YouTube にアクセス
    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    // newtab.html にリダイレクトされることを確認
    await youtubePage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(youtubePage.url()).toContain('newtab.html');

    await youtubePage.close();
  });

  test('YT-005: YouTube Time Limit を設定できる', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // YouTube Time Limit を設定
    await setSettings(page, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: false,
        hideShorts: false,
        hideRecommendations: false,
        hideComments: false,
        timeLimit: {
          type: 'daily',
          limitSeconds: 120
        }
      })
    });

    // 設定が保存されたことを確認
    const settings = await getStorageData(page, 'settings');
    expect(settings?.youtube.timeLimit?.limitSeconds).toBe(120);

    await page.close();
  });

  test('YT-006: アクセスブロックが無効なら Time Limit 超過でも画面を隠さない', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // アクセスブロックは無効のまま Time Limit だけ残っている状態（#407）。
    // 注入される CSS の期待値を同じ設定から組み立てるため、変数に取る
    const youtubeSettings = makeYouTubeSettings({
      blockAccess: false,
      hideShorts: true, // コンテンツスクリプトが動いたことを確かめるための目印
      hideRecommendations: false,
      hideComments: false,
      timeLimit: {
        type: 'daily',
        limitSeconds: 1 // 1秒
      }
    }) as unknown as YouTubeSettings;

    await setSettings(page, {
      paused: false,
      youtube: youtubeSettings
    });

    // 既に超過（analytics.timeLimitUsage に youtube.com の使用データを設定）
    const todayKey = new Date().toISOString().split('T')[0];
    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteTime: {},
      siteCategories: {},
      siteBlockCounts: {},
      siteUnblockCounts: {},
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 10, // 超過（limitSeconds: 1）
          lastDailyReset: todayKey
        }
      }
    });

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // コンテンツスクリプトは storage を読んでから style を注入するため、
    // Shorts 非表示のルールが入るまで待つ
    await expect
      .poll(() =>
        youtubePage.evaluate(() => {
          const style = document.getElementById('vision-focus-youtube-blocker');
          return style?.textContent?.includes('a[title="Shorts"]');
        })
      )
      .toBeTruthy();

    // 1. 上限超過でもリダイレクトされない
    //    （アクセスブロックが有効なときだけ newtab.html へ飛ばす。YT-004 を参照）
    expect(youtubePage.url()).not.toContain('newtab.html');
    expect(new URL(youtubePage.url()).hostname).toBe(TEST_DOMAINS.youtube);

    // 2. 注入された CSS は、設定で有効にした非表示のルールだけ。
    //    コンテンツスクリプトは generateYouTubeHideCSS の出力を
    //    そのまま style に入れる（src/entrypoints/youtube.content.ts の
    //    applyStyles）ので、同じ設定から作った期待値と丸ごと突き合わせる。
    //    この関数は設定しか受け取らず利用実績を見ないため、
    //    「上限超過だから隠す」ルールが復活すれば必ず差分になる（#425）
    const injectedCss = await youtubePage.evaluate(() => {
      const style = document.getElementById('vision-focus-youtube-blocker');
      return style?.textContent ?? null;
    });
    expect(injectedCss).toBe(generateYouTubeHideCSS(youtubeSettings));

    await youtubePage.close();
  });

  test('YT-007: YouTube 設定変更が即座に反映される', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // 最初は Shorts 非表示なし
    await setSettings(page, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: false,
        hideShorts: false,
        hideRecommendations: false,
        hideComments: false,
        timeLimit: null
      })
    });

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // Shorts が表示されていることを確認
    let shortsHidden = await youtubePage.evaluate(() => {
      const style = document.getElementById('vision-focus-youtube-blocker');
      return style?.textContent?.includes('a[title="Shorts"]');
    });
    expect(shortsHidden).toBeFalsy();

    // 設定を変更する。
    // page.evaluate はページのメインワールドで実行されるため、コンテンツ
    // スクリプトと違い chrome.storage を参照できない。拡張機能ページ経由で更新する
    const updatePage = await openStoragePage(context, extensionId);
    await setSettings(updatePage, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: false,
        hideShorts: true, // 有効化
        hideRecommendations: false,
        hideComments: false,
        timeLimit: null
      })
    });
    await updatePage.close();

    // settings の watch が反応するまで待機
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Shorts が非表示になることを確認
    shortsHidden = await youtubePage.evaluate(() => {
      const style = document.getElementById('vision-focus-youtube-blocker');
      return style?.textContent?.includes('a[title="Shorts"]');
    });
    expect(shortsHidden).toBeTruthy();

    await youtubePage.close();
  });

  test('YT-008: YouTube 有効化/無効化がトラッキング履歴に記録される', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
      youtube: makeYouTubeSettings({
        blockAccess: false,
        hideShorts: false,
        hideRecommendations: false,
        hideComments: false,
        timeLimit: {
          type: 'daily',
          limitSeconds: 60
        }
      })
    });

    // 滞在時間は analytics.siteTime にドメインをキーとして入る
    // （siteStats というキーも totalTime というフィールドも実装に無い）
    await setStorageData(
      page,
      'analytics',
      makeAnalytics({
        siteTime: {
          [TEST_DOMAINS.youtube]: {
            domain: TEST_DOMAINS.youtube,
            time: 120, // 2分間の使用
            category: 'waste',
            lastUpdated: new Date().toISOString()
          }
        }
      })
    );

    await page.close();

    const page2 = await openStoragePage(context, extensionId);
    const analytics = await getStorageData(page2, 'analytics');

    // YouTube のトラッキングデータが記録されていることを確認
    expect(analytics?.siteTime[TEST_DOMAINS.youtube]).toBeDefined();
    expect(analytics?.siteTime[TEST_DOMAINS.youtube].time).toBe(120);

    await page2.close();
  });

  test('YT-009: Hide Shorts + Time Limit 同時設定時に両方が機能する', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // アクセスブロックと制限を併用しても、上限に達するまでは非表示が効く（#422）
    await setSettings(page, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: true,
        hideShorts: true, // Shorts 非表示
        hideRecommendations: false,
        hideComments: false,
        timeLimit: {
          type: 'daily',
          limitSeconds: 60
        }
      })
    });

    // Time Limit は未超過（analytics.timeLimitUsage に youtube.com の使用データを設定）
    const todayKey = new Date().toISOString().split('T')[0];
    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteTime: {},
      siteCategories: {},
      siteBlockCounts: {},
      siteUnblockCounts: {},
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 30, // 未超過（limitSeconds: 60）
          lastDailyReset: todayKey
        }
      }
    });

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // Shorts 非表示の CSS が適用されていることを確認
    const shortsHidden = await youtubePage.evaluate(() => {
      const style = document.getElementById('vision-focus-youtube-blocker');
      return style?.textContent?.includes('a[title="Shorts"]');
    });
    expect(shortsHidden).toBeTruthy();

    // 上限に達していないのでブロックページへは飛ばない（#392）
    expect(youtubePage.url()).toContain(TEST_DOMAINS.youtube);

    await youtubePage.close();
  });

  test('YT-010: blockAccess と Time Limit の併用（超過後にブロック）', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // blockAccess と Time Limit を両方設定
    await setSettings(page, {
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: true, // 完全ブロック
        hideShorts: false,
        hideRecommendations: false,
        hideComments: false,
        timeLimit: {
          type: 'daily',
          limitSeconds: 60
        }
      })
    });

    // Time Limit を超過させる（analytics.timeLimitUsage に youtube.com の使用データを設定）。
    // blockAccess に時間制限を併用した場合は、ブロックリストと同じく超過後にブロックする（#392）
    const todayKey = new Date().toISOString().split('T')[0];
    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteTime: {},
      siteCategories: {},
      siteBlockCounts: {},
      siteUnblockCounts: {},
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 120, // 超過（limitSeconds: 60）
          lastDailyReset: todayKey
        }
      }
    });

    await page.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // YouTube にアクセス
    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    // 超過しているので newtab.html にリダイレクトされる
    await youtubePage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(youtubePage.url()).toContain('newtab.html');

    await youtubePage.close();
  });
});
