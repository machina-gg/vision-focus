import { test, expect } from './fixtures/extension';
import {
  openPopup,
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  SELECTORS,
  TEST_DATA
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
    // デフォルトは 0
    await expect(blockCount).toContainText('0');

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
    await settingsButton.click();

    // 新しいタブでオプション画面が開くのを待つ
    const newPage = await context.waitForEvent('page');
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
    await goalCard.click();

    // 新しいタブでnewtab.htmlが開くのを待つ
    const newPage = await context.waitForEvent('page');
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

    // ヘルプアイコンをクリック
    await helpButton.click();

    // 新しいタブでオプション画面（ヘルプタブ）が開くのを待つ
    const newPage = await context.waitForEvent('page');
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
    const confirmButton = passwordModal.locator(
      'button:has-text("確定"), button:has-text("Confirm")'
    );
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
    const externalPage = await context.newPage();
    await externalPage.goto('https://example.com');
    await externalPage.waitForLoadState('domcontentloaded');

    const page = await openPopup(context, extensionId);

    // QuickBlock の入力フィールドに example.com が自動入力される
    const input = page.locator(SELECTORS.quickBlock.input);
    await expect(input).toHaveValue('example.com');

    await page.close();
    await externalPage.close();
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

    // ストレージに保存されたことを確認
    const blockList = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('blockList');
      return result.blockList || [];
    });

    // reddit.com がブロックリストに含まれる
    expect(blockList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'reddit.com',
          enabled: true
        })
      ])
    );

    await page.close();
  });

  test('POP-012: 言語切り替えでUIが即座に変更される', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    // 言語セレクターが表示される
    const languageSelector = page.locator(SELECTORS.header.languageSelector);
    await expect(languageSelector).toBeVisible();

    // 初期言語は English
    await expect(languageSelector).toHaveValue('en');

    // 日本語に切り替え
    await languageSelector.selectOption('ja');

    // UIが日本語に変更される（目標カードのラベルを確認）
    const goalLabel = page.locator('text=/今日の目標/i');
    await expect(goalLabel).toBeVisible();

    // 英語に戻す
    await languageSelector.selectOption('en');

    // UIが英語に変更される
    const goalLabelEn = page.locator("text=/Today's Goal/i");
    await expect(goalLabelEn).toBeVisible();

    await page.close();
  });

  test('POP-013: PremiumユーザーはAnalyticsリンクが表示される', async ({
    context,
    extensionId
  }) => {
    // Premium 設定済みのストレージをセットアップ
    const setupPage = await openPopup(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPremium: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openPopup(context, extensionId);

    // Analytics リンクが表示される
    const analyticsLink = page.locator(SELECTORS.premium.analyticsLink);
    await expect(analyticsLink).toBeVisible();

    // クリックでオプション画面の Analytics タブが開く
    await analyticsLink.click();

    const newPage = await context.waitForEvent('page');
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
    await setStorageData(setupPage, 'blockList', [
      {
        id: '1',
        domain: 'youtube.com',
        isWildcard: false,
        createdAt: new Date().toISOString(),
        enabled: true,
        timeLimit: {
          type: 'daily',
          limitSeconds: 1800 // 30分
        }
      }
    ]);

    // Time Limit 使用状況をセットアップ（残り10分）
    await setStorageData(setupPage, 'timeLimitUsage', [
      {
        domain: 'youtube.com',
        dailyUsedSeconds: 1200, // 20分使用済み
        hourlyUsedSeconds: 0,
        lastDailyReset: new Date().toISOString().split('T')[0],
        lastHourlyReset: ''
      }
    ]);

    // 最後にブロックされたドメインとして youtube.com をセット
    await setStorageData(setupPage, 'lastBlockedDomain', 'youtube.com');
    await setupPage.close();

    // YouTube タブを開いてからポップアップを開く（実際のシナリオを再現）
    const youtubePage = await context.newPage();
    await youtubePage.goto('https://youtube.com');

    const page = await openPopup(context, extensionId);

    // Time Limit バッジが表示される
    const timeLimitBadge = page
      .locator('span.inline-flex.items-center.gap-1')
      .filter({ hasText: /残り|Remaining/i });
    await expect(timeLimitBadge).toBeVisible();

    // 残り時間が約10分であることを確認（柔軟な正規表現）
    await expect(timeLimitBadge).toContainText(/10m|10分|10 min/i);

    await page.close();
    await youtubePage.close();
  });
});
