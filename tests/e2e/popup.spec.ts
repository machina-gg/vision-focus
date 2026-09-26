import { test, expect } from './fixtures/extension';
import {
  openPopup,
  openOptions,
  openExternalSite,
  setupTestStorage,
  clearStorage,
  setStorageData,
  setSettings,
  setSites,
  getStorageData,
  makeActivity,
  SELECTORS,
  TEST_DATA,
  TEST_DOMAINS
} from './helpers';

test.describe('Popup 画面', () => {
  test.beforeEach(async ({ context, extensionId }) => {
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

    await expect(page.locator(SELECTORS.header.logo)).toBeVisible();

    await expect(page.locator(SELECTORS.quickBlock.heading)).toBeVisible();

    await expect(page.locator(SELECTORS.goalCard.container)).toBeVisible();

    await expect(page.locator(SELECTORS.summary.heading)).toBeVisible();
    await expect(page.locator(SELECTORS.summary.blockCount)).toBeVisible();

    await page.close();
  });

  test('POP-002: ヘッダーにロゴと設定アイコンが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    const logo = page.locator(SELECTORS.header.logo);
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('alt', 'VisionFocus');

    await expect(page.locator(SELECTORS.header.settingsButton)).toBeVisible();

    await page.close();
  });

  test('POP-003: 目標カードに目標テキストが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    const goalCard = page.locator(SELECTORS.goalCard.container);
    await expect(goalCard).toBeVisible();

    const goalText = page.locator(SELECTORS.goalCard.goalText);
    await expect(goalText).toContainText('Focus on what matters');

    await page.close();
  });

  test('POP-004: 今日のサマリー（ブロック回数、トップブロックサイト）が表示', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openPopup(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([
        ['example.com', { blocks: 2 }],
        ['example.com', { blocks: 9 }, 1]
      ])
    );
    await setupPage.close();

    const page = await openPopup(context, extensionId);

    await expect(page.locator(SELECTORS.summary.heading)).toBeVisible();

    const blockCount = page.locator(SELECTORS.summary.blockCount);
    await expect(blockCount).toBeVisible();
    await expect(blockCount).toHaveText('2');

    await expect(
      page.locator(SELECTORS.summary.topBlockedSiteDomain)
    ).toHaveText('example.com');

    await page.close();
  });

  test('POP-005: 設定アイコンクリックでオプション画面が開く', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    const settingsButton = page.locator(SELECTORS.header.settingsButton);

    // クリックより先に待機を張る（クリック後だとタブ生成を取りこぼす）
    const newPagePromise = context.waitForEvent('page');
    await settingsButton.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');

    expect(newPage.url()).toContain('options.html');

    await newPage.close();
    await page.close();
  });

  test('POP-006: 目標カードクリックでダッシュボード（新規タブ）が開く', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    const goalCard = page.locator(SELECTORS.goalCard.container);

    // クリックより先に待機を張る（クリック後だとタブ生成を取りこぼす）
    const newPagePromise = context.waitForEvent('page');
    await goalCard.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');

    expect(newPage.url()).toContain('newtab.html');

    await newPage.close();
    await page.close();
  });

  test('POP-007: ヘルプアイコンクリックでヘルプタブが開く', async ({
    context,
    extensionId
  }) => {
    const page = await openPopup(context, extensionId);

    const helpButton = page.locator(SELECTORS.header.helpButton);
    await expect(helpButton).toBeVisible();

    // クリックより先に待機を張る（クリック後だとタブ生成を取りこぼす）
    const newPagePromise = context.waitForEvent('page');
    await helpButton.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');

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

    const pauseToggle = page.locator(SELECTORS.header.pauseToggle);
    await expect(pauseToggle).toBeVisible();

    await expect(pauseToggle).toHaveAttribute('aria-checked', 'true');

    await pauseToggle.click();

    await expect(pauseToggle).toHaveAttribute('aria-checked', 'false');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

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
    const setupPage = await openPopup(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openPopup(context, extensionId);

    const pauseToggle = page.locator(SELECTORS.header.pauseToggle);
    await pauseToggle.click();

    const passwordModal = page.locator(SELECTORS.modal.passwordModal);
    await expect(passwordModal).toBeVisible();

    const passwordInput = passwordModal.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    await passwordInput.fill(TEST_DATA.password.valid);

    const confirmButton = page.locator(SELECTORS.modal.passwordConfirmButton);
    await confirmButton.click();

    await expect(passwordModal).not.toBeVisible();

    await expect(pauseToggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('POP-010: クイックブロックボタンに現在のドメインが表示される', async ({
    context,
    extensionId
  }) => {
    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    const popupPage = await openPopup(context, extensionId);

    // ポップアップを開くとポップアップ自身がアクティブタブになるため、サイトのタブを前面に戻して reload する
    await sitePage.bringToFront();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');

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

    const input = page.locator(SELECTORS.quickBlock.input);
    await input.fill('reddit.com');

    const blockButton = page.locator(SELECTORS.quickBlock.button);
    await blockButton.click();

    await expect
      .poll(
        async () => {
          const sites = await getStorageData(page, 'sites');
          return sites?.['reddit.com']?.block?.enabled ?? null;
        },
        { timeout: 10000 }
      )
      .toBe(true);

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

    const analyticsLink = page.locator(SELECTORS.analyticsEntry.analyticsLink);
    await expect(analyticsLink).toBeVisible();

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
    const setupPage = await openPopup(context, extensionId);
    await setSettings(setupPage, { paused: false });
    await setSites(setupPage, [
      {
        domain: TEST_DOMAINS.example,
        block: { timeLimit: { type: 'daily', limitSeconds: 1800 } }
      }
    ]);

    await setStorageData(
      setupPage,
      'activity',
      makeActivity([[TEST_DOMAINS.example, { seconds: 1200 }]])
    );
    await setupPage.close();

    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    const popupPage = await openPopup(context, extensionId);

    // ポップアップを開くとポップアップ自身がアクティブタブになるため、サイトのタブを前面に戻して reload する
    await sitePage.bringToFront();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');

    // reload で拾えなくても 10 秒ポーリングで拾えるよう timeout を長めに取る
    await expect(
      popupPage.locator('[data-testid="time-limit-badge"]')
    ).toBeVisible({ timeout: 15_000 });

    await popupPage.close();
    await sitePage.close();
  });
});
