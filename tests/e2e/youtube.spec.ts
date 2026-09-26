import { test, expect } from './fixtures/extension';
import {
  holdUnblockConfirm,
  openExternalSite,
  openOptions,
  openStoragePage,
  toggleAfter
} from './helpers/pages';
import {
  getStorageData,
  setStorageData,
  setSettings,
  makeActivity,
  makeSettings,
  makeYouTubeSettings,
  clearStorageFromExtension
} from './helpers/storage';
import { SELECTORS, TEST_DOMAINS, UI_TEXT } from './helpers/constants';
import { triggerBlockRuleRecompute, waitForBlockRules } from './helpers/sw';

// 非表示 CSS の SSOT。テストから期待値を組み立てるために実装と同じ関数を使う。
// ⚠ hideHomeFeed を有効にした設定には使えない。そのルールだけが chrome.i18n の
// 文言を埋め込むため、chrome の無い Node 側では出力が変わる（src/lib/i18n.ts）
import {
  YOUTUBE_SELECTORS,
  generateYouTubeHideCSS
} from '~/lib/youtubeHideStyles';
import type { YouTubeSettings } from '~/types/storage';

// 時間制限の使用量を引くサイトキー（ホスト名ではない。www. 付きで開いても同じ行を読む）
const YOUTUBE_SITE = 'youtube.com';

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

    // Recommendations が非表示になる CSS が適用されているか確認。
    // コンテンツスクリプトは storage を読んでから style を注入するため、
    // 注入が終わるまで待つ（evaluate 一発だと style 要素が無い間は
    // undefined になり、「非表示になっていない」と区別が付かない）
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

    // アクセスブロックは declarativeNetRequest の動的ルールで実現される。
    // 固定時間ではなく、youtube.com のルールが載るまで待つ
    await waitForBlockRules(context, [TEST_DOMAINS.youtube]);

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

    // 既に超過（activity の今日の行に youtube.com の表示秒数を設定。limitSeconds: 1）
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

    // 最初は Shorts 非表示なし。注入される CSS の期待値を同じ設定から
    // 組み立てるため、変数に取る
    const initialSettings = makeYouTubeSettings({
      blockAccess: false,
      hideShorts: false,
      hideRecommendations: false,
      hideComments: false,
      timeLimit: null
    });

    await setSettings(page, {
      paused: false,
      youtube: initialSettings
    });

    await page.close();

    const youtubePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.youtube}`
    );

    await youtubePage.waitForLoadState('domcontentloaded');

    // Shorts が表示されていることを確認する。
    // ⚠ style 要素が無い間は textContent が undefined になり、
    //    「まだ注入されていない」状態でも falsy として通ってしまう。
    //    先に注入そのものを待ってから中身を確かめる
    const styleContent = () =>
      youtubePage.evaluate(() => {
        const style = document.getElementById('vision-focus-youtube-blocker');
        return style ? (style.textContent ?? '') : null;
      });

    await expect.poll(styleContent).not.toBeNull();

    // 注入された CSS は設定から組み立てた期待値と丸ごと一致する
    // （この設定では非表示のルールが 1 つも無いので空文字列）
    expect(await styleContent()).toBe(generateYouTubeHideCSS(initialSettings));

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

    // settings の watch が反応して CSS が差し替わるまで待つ。
    // 待つ対象は「Shorts 非表示のルールが入ったか」そのもので、
    // これを書くのは設定変更を受け取ったコンテンツスクリプトだけ
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

    // Time Limit は未超過（activity の今日の行に youtube.com の表示秒数を設定。limitSeconds: 60）
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

    // Shorts 非表示の CSS が適用されていることを確認。
    // 注入は storage の読み出し後なので、入るまで待つ
    await expect
      .poll(() =>
        youtubePage.evaluate(() => {
          const style = document.getElementById('vision-focus-youtube-blocker');
          return style?.textContent ?? '';
        })
      )
      .toContain(YOUTUBE_SELECTORS.shortsSidebarTab);

    // 上限に達していないのでブロックページへは飛ばない（#392）。
    // URL の部分一致だと newtab.html?reason=... でも通るため、
    // ホスト名そのものを確かめる
    expect(youtubePage.url()).not.toContain('newtab.html');
    expect(new URL(youtubePage.url()).hostname).toBe(TEST_DOMAINS.youtube);

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

    // Time Limit を超過させる（activity の今日の行に youtube.com の表示秒数を設定。limitSeconds: 60）。
    // blockAccess に時間制限を併用した場合は、ブロックリストと同じく超過後にブロックする
    await setStorageData(
      page,
      'activity',
      makeActivity([[YOUTUBE_SITE, { seconds: 120 }]])
    );

    await page.close();

    // 超過判定は activity を見るが、activity の変更は再計算のトリガーに
    // ならない。実装と同じ経路（check-schedule アラーム）で再計算させてから、
    // youtube.com のルールが載るまで待つ
    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.youtube]);

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
  test('YT-011: YouTube ブロックの有効化を OFF にすると確認が出て、長押しで解除される', async ({
    context,
    extensionId
  }) => {
    // YouTube 設定はフィールドが欠けるとスキーマ検証に落ちて保存されないため、
    // 完全な形を書く makeYouTubeSettings を使う。パスワード保護は無し
    const setupPage = await openStoragePage(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({ youtube: makeYouTubeSettings({ enabled: true }) })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // トグルはラベルを button の外に描画するため、見出しからたどる
    const masterToggle = toggleAfter(
      page.getByRole('heading', { name: UI_TEXT.youtube.enable })
    );
    await expect(masterToggle).toHaveAttribute('aria-checked', 'true');

    await masterToggle.click();

    // 確認が出ている間は、トグルも保存値も ON のまま
    const dialog = page.locator(SELECTORS.modal.unblockConfirm);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(TEST_DOMAINS.youtube);
    await expect(masterToggle).toHaveAttribute('aria-checked', 'true');

    // 既定の 5 秒の長押しで確定する
    await holdUnblockConfirm(page);

    await expect(masterToggle).toHaveAttribute('aria-checked', 'false');
    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.youtube?.enabled;
      })
      .toBe(false);

    await page.close();
  });
});
