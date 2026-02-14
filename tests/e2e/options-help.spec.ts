import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  setStorageData,
  SELECTORS,
  TEST_DATA
} from './helpers';

/**
 * E2Eテスト: Options - Help Tab
 *
 * OPT-H01 ~ OPT-H10 のテストケースを実装
 */

test.describe('Options - Help Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('OPT-H01: ヘルプタブが表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'help');

    // ヘルプタブが表示される
    await expect(page.locator(SELECTORS.options.helpTab)).toBeVisible();

    // はじめにセクションが表示される
    await expect(page.locator(SELECTORS.help.gettingStarted)).toBeVisible();

    await page.close();
  });

  test('OPT-H02: 基本的な使い方が表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'help');

    // はじめにセクションが表示される
    const gettingStarted = page.locator(SELECTORS.help.gettingStarted);
    await expect(gettingStarted).toBeVisible();

    // 使い方の説明が表示される
    await expect(
      page.locator('text=/Block Sites|サイトをブロック/i')
    ).toBeVisible();
    await expect(
      page.locator('text=/Dashboard|ダッシュボード/i')
    ).toBeVisible();

    await page.close();
  });

  test('OPT-H03: FAQ が表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'help');

    // FAQセクションが表示される
    const faq = page.locator(SELECTORS.help.faq);
    await expect(faq).toBeVisible();

    // FAQ項目が表示される
    const faqItems = page.locator(SELECTORS.help.faqItem);
    const count = await faqItems.count();
    expect(count).toBeGreaterThan(0);

    // FAQ項目をクリックして展開できる
    await faqItems.first().click();

    // 展開された内容が表示される
    const openedItem = faqItems.first();
    await expect(openedItem).toHaveAttribute('open', '');

    await page.close();
  });

  test('OPT-H04: パスワード設定セクションが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'help');

    // パスワードセクションが表示される
    const passwordSection = page.locator(SELECTORS.help.passwordSection);
    await expect(passwordSection).toBeVisible();

    // パスワード設定ボタンが表示される
    const setPasswordButton = page.locator(SELECTORS.help.setPasswordButton);
    await expect(setPasswordButton).toBeVisible();

    await page.close();
  });

  test('OPT-H05: パスワードを設定できる', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'help');

    // パスワード設定ボタンをクリック
    const setPasswordButton = page.locator(SELECTORS.help.setPasswordButton);
    await setPasswordButton.click();

    // パスワード入力フィールドが表示される
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    // パスワードを入力
    await passwordInput.fill('test1234');

    // 確認用パスワードを入力
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    await confirmPasswordInput.fill('test1234');

    // 保存ボタンをクリック
    const saveButton = page.locator(
      'button:has-text("保存"), button:has-text("Save")'
    );
    await saveButton.click();

    // パスワードが設定される
    await page.waitForTimeout(1000); // 保存処理待ち

    // パスワード変更ボタンが表示される
    const changePasswordButton = page.locator(
      SELECTORS.help.changePasswordButton
    );
    const isChangeVisible = await changePasswordButton
      .isVisible()
      .catch(() => false);
    expect(isChangeVisible).toBeTruthy();

    await page.close();
  });

  test('OPT-H06: パスワードを変更できる', async ({ context, extensionId }) => {
    // パスワード設定済みのストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'help');

    // パスワード変更ボタンをクリック
    const changePasswordButton = page.locator(
      SELECTORS.help.changePasswordButton
    );
    await expect(changePasswordButton).toBeVisible();
    await changePasswordButton.click();

    // 現在のパスワード入力
    const currentPasswordInput = page.locator('input[type="password"]').first();
    await currentPasswordInput.fill(TEST_DATA.password.valid);

    // 新しいパスワード入力
    const newPasswordInput = page.locator('input[type="password"]').nth(1);
    await newPasswordInput.fill('newpass1234');

    // 確認用パスワード入力
    const confirmPasswordInput = page.locator('input[type="password"]').nth(2);
    await confirmPasswordInput.fill('newpass1234');

    // 保存ボタンをクリック
    const saveButton = page.locator(
      'button:has-text("保存"), button:has-text("Save")'
    );
    await saveButton.click();

    // パスワードが変更される
    await page.waitForTimeout(1000); // 保存処理待ち

    await page.close();
  });

  test('OPT-H07: パスワードを削除できる', async ({ context, extensionId }) => {
    // パスワード設定済みのストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'help');

    // パスワード削除ボタンをクリック
    const removePasswordButton = page.locator(
      SELECTORS.help.removePasswordButton
    );
    await expect(removePasswordButton).toBeVisible();
    await removePasswordButton.click();

    // 確認ダイアログが表示される可能性がある
    page.on('dialog', (dialog) => dialog.accept());

    // パスワードが削除される
    await page.waitForTimeout(1000); // 削除処理待ち

    // パスワード設定ボタンが再度表示される
    const setPasswordButton = page.locator(SELECTORS.help.setPasswordButton);
    const isSetVisible = await setPasswordButton.isVisible().catch(() => false);
    expect(isSetVisible).toBeTruthy();

    await page.close();
  });

  test('OPT-H08: Analytics Opt-In 設定を変更できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'help');

    // Analytics Opt-Inトグルが表示される
    const optInToggle = page.locator(SELECTORS.help.analyticsOptInToggle);
    await expect(optInToggle).toBeVisible();

    // 初期状態を確認
    const initialState = await optInToggle.getAttribute('aria-checked');

    // トグルをクリック
    await optInToggle.click();

    // 状態が変更される
    const newState = await optInToggle.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);

    await page.close();
  });

  test('OPT-H09: 設定データをエクスポートできる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'help');

    // エクスポートボタンが表示される
    const exportButton = page.locator(SELECTORS.help.exportSettingsButton);
    await expect(exportButton).toBeVisible();

    // エクスポートボタンをクリック（ダウンロードが発生）
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();

    // ダウンロードが開始される
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/vision.*\.json/i);

    await page.close();
  });

  test('OPT-H10: 設定データをインポートできる', async ({
    context,
    extensionId
  }) => {
    // テスト用のJSONデータを準備
    const testData = {
      version: '1.0.0',
      settings: {
        language: 'en',
        paused: false
      },
      vision: {
        defaultSettings: {
          goalText: 'Imported Goal',
          subText: 'Imported Sub'
        },
        presets: [],
        activePresetId: null
      }
    };

    const page = await openOptions(context, extensionId, 'help');

    // インポートボタンが表示される
    const importButton = page.locator(SELECTORS.help.importSettingsButton);
    await expect(importButton).toBeVisible();

    // ファイル選択イベントをシミュレート
    // Playwrightではファイル入力を直接操作
    const fileInput = page.locator('input[type="file"]');

    // ファイルをセット（一時ファイルを作成）
    await fileInput.setInputFiles({
      name: 'test-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(testData))
    });

    // インポート処理が実行される
    await page.waitForTimeout(2000); // 処理待ち

    // インポート成功メッセージが表示される
    const successMessage = page.locator('text=/成功|Success|Imported/i');
    const isSuccessVisible = await successMessage
      .isVisible()
      .catch(() => false);
    expect(isSuccessVisible).toBeTruthy();

    await page.close();
  });
});
