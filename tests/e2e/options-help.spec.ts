import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  getStorageData,
  makeSettings,
  makeDisplaySettings,
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
    await clearStorage(page);
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

    // 使い方の手順が複数表示される（見出しは h3 で列挙される）
    await expect(page.locator('h3').first()).toBeVisible();
    expect(await page.locator('h3').count()).toBeGreaterThan(0);

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

    // パスワード保護の有効化トグルが表示される
    // （「設定」ボタンではなくトグルで有効化する UI）
    await expect(
      page.locator(SELECTORS.help.passwordEnableToggle)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-H05: パスワードを設定できる', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'help');

    // トグルでパスワード保護を有効化すると設定フォームが開く
    await page.locator(SELECTORS.help.passwordEnableToggle).click();

    const fields = page.locator(SELECTORS.help.passwordField);
    await expect(fields.first()).toBeVisible();

    // 新しいパスワードと確認用パスワードを入力
    await fields.nth(0).fill('test1234');
    await fields.nth(1).fill('test1234');

    // 送信する
    await page.locator(SELECTORS.help.passwordFormSubmit).click();

    // 保存されるとフォームが閉じ、トグルが有効になる
    await expect(fields.first()).toBeHidden();
    await expect(
      page.locator(SELECTORS.help.passwordEnableToggle)
    ).toHaveAttribute('aria-checked', 'true');

    // ストレージにも反映されている
    const settings = await getStorageData<{
      password?: { enabled: boolean; passwordHash: string | null };
    }>(page, 'settings');
    expect(settings?.password?.enabled).toBe(true);
    expect(settings?.password?.passwordHash).toBeTruthy();

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
      SELECTORS.help.passwordChangeButton
    );
    await expect(changePasswordButton).toBeVisible();
    await changePasswordButton.click();

    // 現在 / 新規 / 確認の 3 フィールドを入力する
    const fields = page.locator(SELECTORS.help.passwordField);
    await expect(fields).toHaveCount(3);
    await fields.nth(0).fill(TEST_DATA.password.valid);
    await fields.nth(1).fill('newpass1234');
    await fields.nth(2).fill('newpass1234');

    // 送信する
    await page.locator(SELECTORS.help.passwordFormSubmit).click();

    // フォームが閉じ、新しいハッシュが保存される
    await expect(fields.first()).toBeHidden();
    const settings = await getStorageData<{
      password?: { enabled: boolean; passwordHash: string | null };
    }>(page, 'settings');
    expect(settings?.password?.enabled).toBe(true);
    expect(settings?.password?.passwordHash).not.toBe(
      TEST_DATA.password.validHash
    );

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

    // トグルをオフにするとパスワード保護が解除される
    const toggle = page.locator(SELECTORS.help.passwordEnableToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();

    // 解除確認のためのパスワード入力を求められる
    const fields = page.locator(SELECTORS.help.passwordField);
    await expect(fields.first()).toBeVisible();
    await fields.first().fill(TEST_DATA.password.valid);
    await page.locator(SELECTORS.help.passwordFormSubmit).click();

    // 保護が解除される
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    const settings = await getStorageData<{
      password?: { enabled: boolean; passwordHash: string | null };
    }>(page, 'settings');
    expect(settings?.password?.enabled).toBe(false);

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

    // 状態が変更される（保存とストレージ購読を経るため属性の変化を待つ）
    await expect(optInToggle).toHaveAttribute(
      'aria-checked',
      initialState === 'true' ? 'false' : 'true'
    );

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
      settings: makeSettings(),
      vision: {
        defaultSettings: makeDisplaySettings({ goalText: 'Imported Goal' }),
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

    // インポート結果メッセージが表示される（一定時間で消えるため待機で判定）
    const resultMessage = page.locator(SELECTORS.help.importResultMessage);
    await expect(resultMessage).toBeVisible();

    // エラーではないことを確認する
    await expect(resultMessage).not.toContainText(/error|失敗|不正/i);

    await page.close();
  });
});
