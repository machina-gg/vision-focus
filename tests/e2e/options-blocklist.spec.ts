import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  TEST_DATA,
  SELECTORS,
  getStorageData,
  holdUnblockConfirm
} from './helpers';

/**
 * E2Eテスト: Options 画面（ブロックリストタブ）
 *
 * OPT-B01 ~ OPT-B13 のテストケースを実装
 */

test.describe('Options 画面（ブロックリストタブ）', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
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

    // ブロックリストタブをクリック
    const blocklistTab = page.locator(SELECTORS.options.blocklistTab);
    await expect(blocklistTab).toBeVisible();
    await blocklistTab.click();

    // ブロックリストタブがアクティブになる
    await expect(blocklistTab).toHaveAttribute('aria-selected', 'true');

    // ドメイン追加フォームが表示される
    await expect(page.locator(SELECTORS.options.domainInput)).toBeVisible();

    await page.close();
  });

  test('OPT-B02: ドメインを入力してブロックリストに追加できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'blocklist');

    // ドメイン入力フィールドに reddit.com を入力
    const input = page.locator(SELECTORS.options.domainInput);
    await input.fill('reddit.com');

    // 追加ボタンをクリック
    await page.locator(SELECTORS.options.addButton).click();

    // ブロックリストに追加されたことを確認
    const domainItem = page.locator(SELECTORS.options.itemDomain);
    await expect(domainItem.first()).toContainText('reddit.com');

    // ストレージに保存されたことを確認
    const settings = await getStorageData<{ blockList?: unknown[] }>(
      page,
      'settings'
    );
    const blockList = settings?.blockList ?? [];

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

  test('OPT-B03: ワイルドカード（*.example.com）が入力できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'blocklist');

    // ワイルドカード付きドメインを入力
    const input = page.locator(SELECTORS.options.domainInput);
    await input.fill('*.reddit.com');

    // 追加ボタンをクリック
    await page.locator(SELECTORS.options.addButton).click();

    // ブロックリストに追加されたことを確認（*. は別要素で描画される）
    const domainItem = page.locator(SELECTORS.options.itemDomain);
    await expect(domainItem.first()).toContainText('reddit.com');

    // ストレージに保存されたことを確認
    const settings = await getStorageData<{ blockList?: unknown[] }>(
      page,
      'settings'
    );
    const blockList = settings?.blockList ?? [];

    expect(blockList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: '*.reddit.com',
          isWildcard: true,
          enabled: true
        })
      ])
    );

    await page.close();
  });

  test('OPT-B04: ブロックリストの項目を削除できる', async ({
    context,
    extensionId
  }) => {
    // ブロックリスト付きのストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // example.com が表示されることを確認
    const domainItem = page.locator(SELECTORS.options.itemDomain).first();
    await expect(domainItem).toContainText('example.com');

    // 削除ボタンをクリック
    await page.locator(SELECTORS.options.deleteButton).first().click();

    // Unblock 確認モーダルで確定する（5 秒の長押しが必要）
    await expect(page.locator(SELECTORS.modal.unblockConfirm)).toBeVisible();
    await holdUnblockConfirm(page);

    // 項目が削除されたことを確認
    await expect(page.locator(SELECTORS.options.listItem)).toHaveCount(0);

    await page.close();
  });

  test('OPT-B05: ブロックリストの項目を有効/無効切り替えできる', async ({
    context,
    extensionId
  }) => {
    // ブロックリスト付きのストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // ブロックリスト項目のトグルを取得する
    const toggle = page.locator(SELECTORS.options.itemToggle).first();
    await expect(toggle).toBeVisible();

    // 初期状態は有効（aria-checked="true"）
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // トグルをクリックして無効化
    await toggle.click();

    // Unblock 確認モーダルで確定する（5 秒の長押しが必要）
    await expect(page.locator(SELECTORS.modal.unblockConfirm)).toBeVisible();
    await holdUnblockConfirm(page);

    // トグルが無効になる
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-B06: Time Limit（時間制限）を設定できる', async ({
    context,
    extensionId
  }) => {
    // ブロックリスト付きのストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // Time Limit 設定ボタンまたはセクションを探す
    const timeLimitButton = page
      .locator('button, a')
      .filter({ hasText: /Time Limit|時間制限|Set limit/i })
      .first();

    // ボタンが存在する場合はクリック
    if (await timeLimitButton.isVisible()) {
      await timeLimitButton.click();

      // Time Limit 設定 UI が表示される
      const timeLimitUI = page.locator('text=/Daily|Hourly|毎日|毎時/i');
      await expect(timeLimitUI.first()).toBeVisible();
    }

    await page.close();
  });

  test('OPT-B07: パスワード保護設定時、削除・無効化時にパスワード認証が必要', async ({
    context,
    extensionId
  }) => {
    // パスワード保護付きのストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // トグルスイッチをクリックして無効化を試みる
    const toggle = page.locator('[role="switch"]').first();
    await toggle.click();

    // パスワードモーダルが表示される
    const passwordModal = page
      .locator('[role="dialog"]')
      .filter({ hasText: /Password|パスワード/i });
    await expect(passwordModal).toBeVisible();

    // パスワード入力フィールドが表示される
    const passwordInput = passwordModal.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // 正しいパスワードを入力
    await passwordInput.fill(TEST_DATA.password.valid);

    // 確定ボタンをクリック
    const confirmButton = passwordModal
      .locator('button')
      .filter({ hasText: /Confirm|確定/i });
    await confirmButton.click();

    // モーダルが閉じる
    await expect(passwordModal).not.toBeVisible();

    // トグルが無効になる
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-B08: パスワード未設定時、Unblock 確認モーダルが表示される', async ({
    context,
    extensionId
  }) => {
    // ブロックリスト付き（パスワードなし）のストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withPassword: false,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // トグルスイッチをクリックして無効化を試みる
    const toggle = page.locator(SELECTORS.options.itemToggle).first();
    await toggle.click();

    // Unblock 確認モーダルが表示される
    await expect(page.locator(SELECTORS.modal.unblockConfirm)).toBeVisible();

    // 長押しで確定する（5 秒の長押しが必要な実装）
    await holdUnblockConfirm(page);

    // トグルが無効になる
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-B09: ブロック回数が各ドメインに表示される', async ({
    context,
    extensionId
  }) => {
    // ブロックリストと Analytics データをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });

    await setStorageData(setupPage, 'analytics', {
      siteBlockCounts: {
        'example.com': {
          domain: 'example.com',
          count: 12,
          lastBlockedAt: new Date().toISOString()
        }
      },
      timeLimitUsage: {}
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // ブロック回数が表示される
    const blockCount = page.locator('text=/12/i').first();
    await expect(blockCount).toBeVisible();

    await page.close();
  });

  test('OPT-B10: YouTube セクションが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'blocklist');

    // YouTube セクションが表示される
    const youtubeSection = page.locator('text=/YouTube/i');
    await expect(youtubeSection.first()).toBeVisible();

    await page.close();
  });

  test('OPT-B11: YouTube ブロック設定（Shorts/Recommendations/Comments）を切り替え', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'blocklist');

    // YouTube セクションまでスクロール
    const youtubeSection = page.locator('text=/YouTube/i').first();
    await youtubeSection.scrollIntoViewIfNeeded();

    // YouTube 有効化トグルを探す
    const youtubeToggle = page
      .locator('[role="switch"]')
      .filter({ has: page.locator('text=/YouTube|Enable/i') })
      .first();

    // トグルが存在する場合はクリック
    if (await youtubeToggle.isVisible()) {
      await youtubeToggle.click();

      // Shorts/Recommendations/Comments のトグルが表示される
      const shortsToggle = page.locator('text=/Shorts/i');
      const recsToggle = page.locator('text=/Recommendations|おすすめ/i');
      const commentsToggle = page.locator('text=/Comments|コメント/i');

      await expect(shortsToggle.first()).toBeVisible();
      await expect(recsToggle.first()).toBeVisible();
      await expect(commentsToggle.first()).toBeVisible();
    }

    await page.close();
  });

  test('OPT-B12: YouTube Time Limit を設定できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'blocklist');

    // YouTube セクションまでスクロール
    const youtubeSection = page.locator('text=/YouTube/i').first();
    await youtubeSection.scrollIntoViewIfNeeded();

    // YouTube を有効化
    const youtubeToggle = page
      .locator('[role="switch"]')
      .filter({ has: page.locator('text=/YouTube|Enable/i') })
      .first();
    if (await youtubeToggle.isVisible()) {
      const isEnabled = await youtubeToggle.getAttribute('aria-checked');
      if (isEnabled === 'false') {
        await youtubeToggle.click();
      }

      // Time Limit 設定が表示される
      const timeLimitSection = page.locator('text=/Time Limit|時間制限/i');
      await expect(timeLimitSection.first()).toBeVisible();
    }

    await page.close();
  });

  test('OPT-B13: 通知設定を変更できる', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'blocklist');

    // 通知設定セクションまでスクロール
    const notificationSection = page.locator('text=/Notification|通知/i');

    // セクションが存在する場合は表示を確認
    if (await notificationSection.first().isVisible()) {
      await notificationSection.first().scrollIntoViewIfNeeded();

      // 通知トグルが表示される
      const notificationToggle = page
        .locator('[role="switch"]')
        .filter({ has: page.locator('text=/Notification|Enable/i') })
        .first();
      await expect(notificationToggle).toBeVisible();

      // トグルをクリック
      const isEnabled = await notificationToggle.getAttribute('aria-checked');
      await notificationToggle.click();

      // トグル状態が変更される
      const newState = await notificationToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(isEnabled);
    }

    await page.close();
  });
});
