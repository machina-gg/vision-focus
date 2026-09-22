import { test, expect } from './fixtures/extension';
import {
  openPopup,
  openOptions,
  openExternalSite,
  setupTestStorage,
  clearStorage,
  setStorageData,
  setSettings,
  getStorageData,
  SELECTORS,
  TEST_DATA,
  TEST_DOMAINS
} from './helpers';

/**
 * E2Eテスト: Popup 画面
 *
 * POP-001 ~ POP-014 のテストケースを実装
 */

test.describe('Popup 画面', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openPopup(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('POP-001: ポップアップが正常に表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // Header が表示される
    await expect(page.locator(SELECTORS.header.logo)).toBeVisible();

    // QuickBlockButton が表示される
    await expect(page.locator(SELECTORS.quickBlock.heading)).toBeVisible();

    // GoalCard が表示される
    await expect(page.locator(SELECTORS.goalCard.container)).toBeVisible();

    // 今日のサマリーが表示される
    await expect(page.locator(SELECTORS.summary.heading)).toBeVisible();
    await expect(page.locator(SELECTORS.summary.blockCount)).toBeVisible();

    await page.close();
  });

  test('POP-002: ヘッダーにロゴと設定アイコンが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // ロゴが表示される
    const logo = page.locator(SELECTORS.header.logo);
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('alt', 'VisionFocus');

    // 設定アイコンが表示される
    await expect(page.locator(SELECTORS.header.settingsButton)).toBeVisible();

    await page.close();
  });

  test('POP-003: 目標カードに目標テキストが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // 目標カードが表示される
    const goalCard = page.locator(SELECTORS.goalCard.container);
    await expect(goalCard).toBeVisible();

    // 目標テキストが表示される
    const goalText = page.locator(SELECTORS.goalCard.goalText);
    await expect(goalText).toContainText('Focus on what matters');

    await page.close();
  });

  test('POP-004: 今日のサマリー（ブロック回数、トップブロックサイト）が表示', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // 今日のサマリー見出しが表示される
    await expect(page.locator(SELECTORS.summary.heading)).toBeVisible();

    // ブロック回数が表示される
    const blockCount = page.locator(SELECTORS.summary.blockCount);
    await expect(blockCount).toBeVisible();
    // デフォルトは 0。
    // toContainText だと 10 / 20 / 100 でも通るため、表示そのものと突き合わせる
    await expect(blockCount).toHaveText('0');

    // トップブロックサイトセクションが表示される
    // データがない場合は "No blocked sites yet" メッセージ
    await expect(page.locator(SELECTORS.summary.noBlockedSites)).toBeVisible();

    await page.close();
  });

  test('POP-005: 設定アイコンクリックでオプション画面が開く', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // 設定アイコンをクリック
    const settingsButton = page.locator(SELECTORS.header.settingsButton);

    // クリックより先に待機を張る（クリック後だとタブ生成を取りこぼす）
    const newPagePromise = context.waitForEvent('page');
    await settingsButton.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');

    // オプション画面のURLを確認
    expect(newPage.url()).toContain('options.html');

    await newPage.close();
    await page.close();
  });

  test('POP-006: 目標カードクリックでダッシュボード（新規タブ）が開く', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // 目標カードをクリック
    const goalCard = page.locator(SELECTORS.goalCard.container);

    // クリックより先に待機を張る（クリック後だとタブ生成を取りこぼす）
    const newPagePromise = context.waitForEvent('page');
    await goalCard.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');

    // New Tab 画面のURLを確認
    expect(newPage.url()).toContain('newtab.html');

    await newPage.close();
    await page.close();
  });

  test('POP-007: ヘルプアイコンクリックでヘルプタブが開く', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // ヘルプアイコンが表示される
    const helpButton = page.locator(SELECTORS.header.helpButton);
    await expect(helpButton).toBeVisible();

    // クリックより先に待機を張る（クリック後だとタブ生成を取りこぼす）
    const newPagePromise = context.waitForEvent('page');
    await helpButton.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');

    // オプション画面のヘルプタブが開いていることを確認
    expect(newPage.url()).toContain('options.html');
    expect(newPage.url()).toContain('#help');

    await newPage.close();
    await page.close();
  });

  test('POP-008: Pause トグルでブロック機能の一時停止ができる', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // Pause トグルが表示される
    const pauseToggle = page.locator(SELECTORS.header.pauseToggle);
    await expect(pauseToggle).toBeVisible();

    // 初期状態はオン（paused: false）
    await expect(pauseToggle).toHaveAttribute('aria-checked', 'true');

    // トグルをクリックして一時停止
    await pauseToggle.click();

    // トグルがオフになる
    await expect(pauseToggle).toHaveAttribute('aria-checked', 'false');

    // ページをリロードして設定が保存されているか確認
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // トグルがオフのまま
    const pauseToggleAfterReload = page.locator(SELECTORS.header.pauseToggle);
    await expect(pauseToggleAfterReload).toHaveAttribute(
      'aria-checked',
      'false'
    );

    await page.close();
  });

  test('POP-009: パスワード保護設定時、Pause トグルにパスワード認証が必要', async ({
    context,
    extensionId
  }) => {
    // パスワード設定済みのストレージをセットアップ
    const setupPage = await openPopup(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openPopup(context, extensionId);

    // Pause トグルをクリック
    const pauseToggle = page.locator(SELECTORS.header.pauseToggle);
    await pauseToggle.click();

    // パスワードモーダルが表示される
    const passwordModal = page.locator(SELECTORS.modal.passwordModal);
    await expect(passwordModal).toBeVisible();

    // パスワード入力フィールドが表示される
    const passwordInput = passwordModal.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // 正しいパスワードを入力
    await passwordInput.fill(TEST_DATA.password.valid);

    // 確定ボタンをクリック
    const confirmButton = page.locator(SELECTORS.modal.passwordConfirmButton);
    await confirmButton.click();

    // モーダルが閉じる
    await expect(passwordModal).not.toBeVisible();

    // トグルがオフになる
    await expect(pauseToggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('POP-010: クイックブロックボタンに現在のドメインが表示される', async ({
    context,
    extensionId
  }) => {
    // 外部サイトを開いてからポップアップを開く
    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    const popupPage = await openPopup(context, extensionId);

    // ポップアップを開いた時点ではポップアップ自身がアクティブタブに
    // なってしまうため、サイトのタブをアクティブに戻してから
    // ポップアップを reload してドメイン取得をやり直させる
    await sitePage.bringToFront();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');

    // QuickBlock の入力フィールドに example.com が自動入力される。
    // reload で拾えなくても 10 秒ポーリングで拾えるよう timeout を長めに取る
    const input = popupPage.locator(SELECTORS.quickBlock.input);
    await expect(input).toHaveValue(TEST_DOMAINS.example, {
      timeout: 15_000
    });

    await popupPage.close();
    await sitePage.close();
  });

  test('POP-011: クイックブロッククリックでサイトがブロックリストに追加される', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // QuickBlock の入力フィールドにドメインを入力
    const input = page.locator(SELECTORS.quickBlock.input);
    await input.fill('reddit.com');

    // ブロックボタンをクリック
    const blockButton = page.locator(SELECTORS.quickBlock.button);
    await blockButton.click();

    // ストレージに保存されたことを確認（ブロックリストは settings 配下）。
    // background へのメッセージ送信は非同期なので反映を待つ
    await expect
      .poll(
        async () => {
          const settings = await getStorageData(page, 'settings');
          return (settings?.blockList ?? []).map((item) => item.domain);
        },
        { timeout: 10000 }
      )
      .toContain('reddit.com');

    const settings = await getStorageData(page, 'settings');
    expect(settings?.blockList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'reddit.com',
          enabled: true
        })
      ])
    );

    await page.close();
  });

  test('POP-013: Analytics リンクが表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openPopup(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openPopup(context, extensionId);

    // Analytics リンクが表示される
    const analyticsLink = page.locator(SELECTORS.analyticsEntry.analyticsLink);
    await expect(analyticsLink).toBeVisible();

    // クリックでオプション画面の Analytics タブが開く。
    // クリックより先に待機を張る（クリック後だとタブ生成を取りこぼす）
    const newPagePromise = context.waitForEvent('page');
    await analyticsLink.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');

    expect(newPage.url()).toContain('options.html');
    expect(newPage.url()).toContain('#analytics');

    await newPage.close();
    await page.close();
  });

  test('POP-014: Time Limit 設定中のサイトで残り時間バッジが表示される', async ({
    context,
    extensionId
  }) => {
    // Time Limit 設定済みのブロックリストをセットアップ
    const setupPage = await openPopup(context, extensionId);
    await setSettings(setupPage, {
      paused: false,
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            type: 'daily',
            limitSeconds: 1800 // 30分
          }
        }
      ]
    });

    // Time Limit 使用状況をセットアップ（残り10分）。
    // 使用状況は analytics.timeLimitUsage にドメインをキーとする
    // レコードとして保持される
    await setStorageData(setupPage, 'analytics', {
      dailyStats: {},
      siteTime: {},
      siteCategories: {},
      siteBlockCounts: {},
      siteUnblockCounts: {},
      timeLimitUsage: {
        [TEST_DOMAINS.example]: {
          domain: TEST_DOMAINS.example,
          dailyUsedSeconds: 1200, // 20分使用済み
          lastDailyReset: new Date().toISOString().split('T')[0]
        }
      }
    });
    await setupPage.close();

    // 外部サイトを開いてからポップアップを開く
    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    const popupPage = await openPopup(context, extensionId);

    // サイトのタブをアクティブに戻してからポップアップを reload し、
    // ドメイン取得をやり直させる
    await sitePage.bringToFront();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');

    // Time Limit バッジが表示される。
    // reload で拾えなくても 10 秒ポーリングで拾えるよう timeout を長めに取る
    await expect(
      popupPage.locator('[data-testid="time-limit-badge"]')
    ).toBeVisible({ timeout: 15_000 });

    await popupPage.close();
    await sitePage.close();
  });
});
