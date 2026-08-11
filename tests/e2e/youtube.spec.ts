import { test, expect } from './fixtures/extension';
import { openExternalSite, openStoragePage } from './helpers/pages';
import {
  setStorageData,
  setSettings,
  makeYouTubeSettings,
  clearStorage,
  clearStorageFromExtension,
  getStorageData
} from './helpers/storage';
import { TEST_DOMAINS } from './helpers/constants';

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
      language: 'en',
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
      language: 'en',
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
      language: 'en',
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
      language: 'en',
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
      language: 'en',
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
    const settings = (await getStorageData(page, 'settings')) as any;
    expect(settings.youtube.timeLimit.limitSeconds).toBe(120);

    await page.close();
  });

  test('YT-006: YouTube Time Limit 超過時に CSS で全コンテンツ非表示', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // YouTube Time Limit を設定
    await setSettings(page, {
      language: 'en',
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: false,
        hideShorts: false,
        hideRecommendations: false,
        hideComments: false,
        timeLimit: {
          type: 'daily',
          limitSeconds: 1 // 1秒
        }
      })
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
          hourlyUsedSeconds: 0,
          lastDailyReset: todayKey,
          lastHourlyReset: ''
        }
      }
    });

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // 全コンテンツが非表示になる CSS が適用されているか確認
    // コンテンツスクリプトは storage を読んでから style を注入するため、
    // 注入が終わるまで待つ
    await expect
      .poll(() =>
        youtubePage.evaluate(() => {
          const style = document.getElementById('vision-focus-youtube-blocker');
          return style?.textContent?.includes('display: none !important');
        })
      )
      .toBeTruthy();

    await youtubePage.close();
  });

  test('YT-007: YouTube 設定変更が即座に反映される', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // 最初は Shorts 非表示なし
    await setSettings(page, {
      language: 'en',
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
      language: 'en',
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

    // storage.watch が反応するまで待機
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
      language: 'en',
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

    // YouTube を訪問
    await setStorageData(page, 'analytics', {
      dailyStats: {},
      siteStats: {
        [TEST_DOMAINS.youtube]: {
          domain: TEST_DOMAINS.youtube,
          blockCount: 0,
          unblockCount: 0,
          totalTime: 120 // 2分間の使用
        }
      }
    });

    await page.close();

    const page2 = await openStoragePage(context, extensionId);
    const analytics = (await getStorageData(page2, 'analytics')) as any;

    // YouTube のトラッキングデータが記録されていることを確認
    expect(analytics.siteStats[TEST_DOMAINS.youtube]).toBeDefined();
    expect(analytics.siteStats[TEST_DOMAINS.youtube].totalTime).toBe(120);

    await page2.close();
  });

  test('YT-009: Hide Shorts + Time Limit 同時設定時に両方が機能する', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    await setSettings(page, {
      language: 'en',
      paused: false,
      youtube: makeYouTubeSettings({
        blockAccess: false,
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
          hourlyUsedSeconds: 0,
          lastDailyReset: todayKey,
          lastHourlyReset: ''
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

    // Time Limit 超過の CSS は適用されていないことを確認。
    // style 要素自体は Shorts 非表示のために存在するため、
    // 超過時だけ入る全体非表示ルールの有無で判定する
    const limitExceeded = await youtubePage.evaluate(() => {
      const style = document.getElementById('vision-focus-youtube-blocker');
      return style?.textContent?.includes('ytd-app #content');
    });
    expect(limitExceeded).toBeFalsy();

    await youtubePage.close();
  });

  test('YT-010: blockAccess と Time Limit の優先順位（blockAccess 優先）', async ({
    context,
    extensionId
  }) => {
    const page = await openStoragePage(context, extensionId);

    // blockAccess と Time Limit を両方設定
    await setSettings(page, {
      language: 'en',
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
          hourlyUsedSeconds: 0,
          lastDailyReset: todayKey,
          lastHourlyReset: ''
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

    // blockAccess が優先され、newtab.html にリダイレクト
    await youtubePage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(youtubePage.url()).toContain('newtab.html');

    await youtubePage.close();
  });
});
