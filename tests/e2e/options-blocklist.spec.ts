import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeAnalytics,
  makeSettings,
  makeSiteBlockCounts,
  makeYouTubeSettings,
  TEST_DATA,
  SELECTORS,
  UI_TEXT,
  getStorageData,
  holdUnblockConfirm,
  toggleAfter
} from './helpers';

/**
 * E2Eテスト: Options 画面（ブロックリストタブ）
 *
 * OPT-B01 ~ OPT-B12 のテストケースを実装
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
    const settings = await getStorageData(page, 'settings');
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
    const settings = await getStorageData(page, 'settings');
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

    // Unblock 確認モーダルで確定する（既定の 5 秒の長押しが必要）
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

    // Unblock 確認モーダルで確定する（既定の 5 秒の長押しが必要）
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

    const item = page.locator(SELECTORS.options.listItem).first();

    // 時間制限の編集欄は折りたたまれている。開閉ボタンの文言は現在の設定
    // （未設定なら「Always Blocked」）で、"Time Limit" という文言のボタンは無い
    // （src/components/options/blocklist/TimeLimitEditor.tsx）
    await item
      .getByRole('button', { name: UI_TEXT.timeLimit.alwaysBlocked })
      .click();

    // 種別を「毎日の上限」に変えると、制限時間の選択肢が現れる
    const selects = item.locator('select');
    await selects.first().selectOption('daily');
    await selects.nth(1).selectOption('5');

    // 保存ボタンを押すまでストレージには書かれない
    await item.getByRole('button', { name: UI_TEXT.common.save }).click();

    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.blockList?.[0]?.timeLimit;
      })
      .toEqual({ type: 'daily', limitSeconds: 5 * 60 });

    // 開閉ボタンの表示も保存済みの値に追従する
    await expect(item.getByRole('button', { name: /5 min/ })).toBeVisible();

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

    // 長押しで確定する（既定の 5 秒の長押しが必要な実装）
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

    // 直近のブロック時刻のキーは lastBlocked（lastBlockedAt は実装に無い）
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([['example.com', 12]])
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // ブロック回数はドメインごとの行にバッジとして出る。
    // ページ全体から「12」を探すと、日付など無関係な表示でも通る
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
    // YouTube 設定はフィールドが欠けているとスキーマ検証に落ち、保存されない
    // （UpdateYouTubeSettingsBodySchema の hideHomeFeed は必須）。
    // 完全な形を書く makeYouTubeSettings を使う
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({ youtube: makeYouTubeSettings({ enabled: false }) })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    // 各トグルはラベルを button の外に描画するため、見出しからたどる
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

    // 個別のトグルは YouTube ブロックが無効な間は操作できない
    await expect(masterToggle).toHaveAttribute('aria-checked', 'false');
    await expect(shortsToggle).toBeDisabled();

    await masterToggle.click();
    await expect(masterToggle).toHaveAttribute('aria-checked', 'true');
    await expect(shortsToggle).toBeEnabled();

    // Shorts / Recommendations / Comments を順に有効化する。
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
        const settings = await getStorageData(page, 'settings');
        const youtube = settings?.youtube;
        return {
          enabled: youtube?.enabled,
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
    // Time Limit の設定欄は「YouTube ブロック有効 + アクセスブロック有効」の
    // ときだけ描画される（src/components/options/blocklist/YouTubeSection.tsx）
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
        youtube: makeYouTubeSettings({ enabled: true, blockAccess: true })
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'blocklist');

    const timeLimitHeading = page.getByRole('heading', {
      name: UI_TEXT.youtube.timeLimitSettings
    });
    await expect(timeLimitHeading).toBeVisible();

    // 見出しの後ろにある 2 つの select が種別と制限時間
    await timeLimitHeading
      .locator('xpath=following::select[1]')
      .selectOption('daily');
    await timeLimitHeading
      .locator('xpath=following::select[2]')
      .selectOption('15');

    // 保存ボタンを押すまでストレージには書かれない
    await timeLimitHeading
      .locator('xpath=following::button[normalize-space(.)="Save"][1]')
      .click();

    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.youtube?.timeLimit;
      })
      .toEqual({ type: 'daily', limitSeconds: 15 * 60 });

    await page.close();
  });
});
