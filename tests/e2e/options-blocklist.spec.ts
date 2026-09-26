import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeActivity,
  makeAppSettings,
  makeSites,
  TEST_DATA,
  SELECTORS,
  UI_TEXT,
  getStorageData,
  holdUnblockConfirm,
  toggleAfter
} from './helpers';

test.describe('Options 画面（ブロックリストタブ）', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withBlockList: false,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('OPT-B01: ブロックリストタブが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);

    const blocklistTab = page.locator(SELECTORS.options.blocklistTab);
    await expect(blocklistTab).toBeVisible();
    await blocklistTab.click();

    await expect(blocklistTab).toHaveAttribute('aria-selected', 'true');

    await expect(page.locator(SELECTORS.options.domainInput)).toBeVisible();

    await page.close();
  });

  test('OPT-B02: ドメインを入力してブロックリストに追加できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'blocklist');

    const input = page.locator(SELECTORS.options.domainInput);
    await input.fill('reddit.com');

    await page.locator(SELECTORS.options.addButton).click();

    const domainItem = page.locator(SELECTORS.options.itemDomain);
    await expect(domainItem.first()).toContainText('reddit.com');

    await expect
      .poll(async () => {
        const sites = await getStorageData(page, 'sites');
        return sites?.['reddit.com']?.block?.enabled ?? null;
      })
      .toBe(true);

    await page.close();
  });

  test('OPT-B03: ワイルドカード（*.example.com）が入力できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'blocklist');

    const input = page.locator(SELECTORS.options.domainInput);
    await input.fill('*.reddit.com');

    await page.locator(SELECTORS.options.addButton).click();

    const domainItem = page.locator(SELECTORS.options.itemDomain);
    await expect(domainItem.first()).toHaveText('reddit.com');

    await expect
      .poll(async () =>
        Object.keys((await getStorageData(page, 'sites')) ?? {})
      )
      .toEqual(['reddit.com']);

    await page.close();
  });

  test('OPT-B04: ブロックリストの項目を削除できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const domainItem = page.locator(SELECTORS.options.itemDomain).first();
    await expect(domainItem).toContainText('example.com');

    await page.locator(SELECTORS.options.deleteButton).first().click();

    await expect(page.locator(SELECTORS.modal.unblockConfirm)).toBeVisible();
    await holdUnblockConfirm(page);

    await expect(page.locator(SELECTORS.options.listItem)).toHaveCount(0);

    await page.close();
  });

  test('OPT-B05: ブロックリストの項目を有効/無効切り替えできる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const toggle = page.locator(SELECTORS.options.itemToggle).first();
    await expect(toggle).toBeVisible();

    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await toggle.click();

    await expect(page.locator(SELECTORS.modal.unblockConfirm)).toBeVisible();
    await holdUnblockConfirm(page);

    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-B06: Time Limit（時間制限）を設定できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const item = page.locator(SELECTORS.options.listItem).first();

    await item
      .getByRole('button', { name: UI_TEXT.timeLimit.alwaysBlocked })
      .click();

    const selects = item.locator('select');
    await selects.first().selectOption('daily');
    await selects.nth(1).selectOption('5');

    await item.getByRole('button', { name: UI_TEXT.common.save }).click();

    await expect
      .poll(async () => {
        const sites = await getStorageData(page, 'sites');
        return sites?.['example.com']?.block?.timeLimit;
      })
      .toEqual({ type: 'daily', limitSeconds: 5 * 60 });

    await expect(item.getByRole('button', { name: /5 min/ })).toBeVisible();

    await page.close();
  });

  test('OPT-B07: パスワード保護設定時、削除・無効化時にパスワード認証が必要', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const toggle = page.locator('[role="switch"]').first();
    await toggle.click();

    const passwordModal = page
      .locator('[role="dialog"]')
      .filter({ hasText: /Password|パスワード/i });
    await expect(passwordModal).toBeVisible();

    const passwordInput = passwordModal.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    await passwordInput.fill(TEST_DATA.password.valid);

    const confirmButton = passwordModal
      .locator('button')
      .filter({ hasText: /Confirm|確定/i });
    await confirmButton.click();

    await expect(passwordModal).not.toBeVisible();

    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-B08: パスワード未設定時、Unblock 確認モーダルが表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withPassword: false,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const toggle = page.locator(SELECTORS.options.itemToggle).first();
    await toggle.click();

    await expect(page.locator(SELECTORS.modal.unblockConfirm)).toBeVisible();

    await holdUnblockConfirm(page);

    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-B09: ブロック回数が各ドメインに表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });

    await setStorageData(
      setupPage,
      'activity',
      makeActivity([
        ['example.com', { blocks: 8 }],
        ['example.com', { blocks: 4 }, 1]
      ])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const item = page
      .locator(SELECTORS.options.listItem)
      .filter({ hasText: 'example.com' });
    await expect(item).toHaveCount(1);
    await expect(item).toContainText(UI_TEXT.blockCount.short(12));

    await page.close();
  });

  test('OPT-B10: YouTube セクションが表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'settings', makeAppSettings());
    await setStorageData(
      setupPage,
      'sites',
      makeSites([
        { domain: 'youtube.com', block: {}, youtube: {} },
        { domain: 'example.com', block: {} }
      ])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const youtubeSection = page.locator('text=/YouTube/i');
    await expect(youtubeSection.first()).toBeVisible();

    await expect(page.locator(SELECTORS.options.itemDomain)).toHaveText([
      'example.com'
    ]);

    await page.close();
  });

  test('OPT-B11: YouTube ブロック設定（Shorts/Recommendations/Comments）を切り替え', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'settings', makeAppSettings());
    await setStorageData(setupPage, 'sites', makeSites([]));
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const masterToggle = toggleAfter(
      page.getByRole('heading', { name: UI_TEXT.youtube.enable })
    );
    const shortsToggle = toggleAfter(
      page.getByRole('heading', { name: UI_TEXT.youtube.hideShorts })
    );
    const recommendationsToggle = toggleAfter(
      page.getByRole('heading', { name: UI_TEXT.youtube.hideRecommendations })
    );
    const commentsToggle = toggleAfter(
      page.getByRole('heading', { name: UI_TEXT.youtube.hideComments })
    );

    await expect(masterToggle).toHaveAttribute('aria-checked', 'false');
    await expect(shortsToggle).toBeDisabled();

    await masterToggle.click();
    await expect(masterToggle).toHaveAttribute('aria-checked', 'true');
    await expect(shortsToggle).toBeEnabled();

    // 保存は 1 件ずつ background 経由で行われるため、反映を待ってから次へ進む
    for (const toggle of [
      shortsToggle,
      recommendationsToggle,
      commentsToggle
    ]) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
    }

    await expect
      .poll(async () => {
        const sites = await getStorageData(page, 'sites');
        const youtube = sites?.['youtube.com']?.youtube;
        return {
          enabled: youtube != null,
          hideShorts: youtube?.hideShorts,
          hideRecommendations: youtube?.hideRecommendations,
          hideComments: youtube?.hideComments
        };
      })
      .toEqual({
        enabled: true,
        hideShorts: true,
        hideRecommendations: true,
        hideComments: true
      });

    await page.close();
  });

  test('OPT-B12: YouTube Time Limit を設定できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'settings', makeAppSettings());
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'youtube.com', block: {}, youtube: {} }])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const timeLimitHeading = page.getByRole('heading', {
      name: UI_TEXT.youtube.timeLimitSettings
    });
    await expect(timeLimitHeading).toBeVisible();

    await expect(page.locator(SELECTORS.options.listItem)).toHaveCount(0);

    await timeLimitHeading
      .locator('xpath=following::select[1]')
      .selectOption('daily');
    await timeLimitHeading
      .locator('xpath=following::select[2]')
      .selectOption('15');

    await timeLimitHeading
      .locator('xpath=following::button[normalize-space(.)="Save"][1]')
      .click();

    await expect
      .poll(async () => {
        const sites = await getStorageData(page, 'sites');
        return sites?.['youtube.com']?.block?.timeLimit;
      })
      .toEqual({ type: 'daily', limitSeconds: 15 * 60 });

    await page.close();
  });
});
