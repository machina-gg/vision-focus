import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  getStorageData,
  holdUnblockConfirm,
  makeSettings,
  makeDisplaySettings,
  toggleAfter,
  SELECTORS,
  TEST_DATA,
  UI_TEXT
} from './helpers';

/**
 * E2Eテスト: Options - Settings Tab
 *
 * OPT-SET01 ~ OPT-SET10 のテストケースを実装
 */

test.describe('Options - Settings Tab', () => {
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

  test('OPT-SET01: 設定タブが表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'settings');

    // 設定タブが選択されている
    await expect(page.locator(SELECTORS.options.settingsTab)).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // ブロック解除の保護 / 通知設定 / データとプライバシー / バックアップが並ぶ
    await expect(
      page.locator(SELECTORS.settings.unblockProtectionSection)
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: UI_TEXT.notifications.heading })
    ).toBeVisible();
    await expect(
      page.locator(SELECTORS.settings.analyticsOptInToggle)
    ).toBeVisible();
    await expect(
      page.locator(SELECTORS.settings.exportSettingsButton)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-SET02: パスワード設定セクションが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'settings');

    // パスワードセクションが表示される
    const passwordSection = page.locator(SELECTORS.settings.passwordSection);
    await expect(passwordSection).toBeVisible();

    // パスワード保護の有効化トグルが表示される
    // （「設定」ボタンではなくトグルで有効化する UI）
    await expect(
      page.locator(SELECTORS.settings.passwordEnableToggle)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-SET03: パスワードを設定できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'settings');

    // トグルでパスワード保護を有効化すると設定フォームが開く
    await page.locator(SELECTORS.settings.passwordEnableToggle).click();

    const fields = page.locator(SELECTORS.settings.passwordField);
    await expect(fields.first()).toBeVisible();

    // 新しいパスワードと確認用パスワードを入力（欄は目印で名指しする）
    await page.locator(SELECTORS.settings.passwordFieldNew).fill('test1234');
    await page
      .locator(SELECTORS.settings.passwordFieldConfirm)
      .fill('test1234');

    // 送信する
    await page.locator(SELECTORS.settings.passwordFormSubmit).click();

    // 保存されるとフォームが閉じ、トグルが有効になる
    await expect(fields.first()).toBeHidden();
    await expect(
      page.locator(SELECTORS.settings.passwordEnableToggle)
    ).toHaveAttribute('aria-checked', 'true');

    // ストレージにも反映されている
    const settings = await getStorageData(page, 'settings');
    expect(settings?.password?.enabled).toBe(true);
    expect(settings?.password?.passwordHash).toBeTruthy();

    await page.close();
  });

  test('OPT-SET04: パスワードを変更できる', async ({
    context,
    extensionId
  }) => {
    // パスワード設定済みのストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    // パスワード変更ボタンをクリック
    const changePasswordButton = page.locator(
      SELECTORS.settings.passwordChangeButton
    );
    await expect(changePasswordButton).toBeVisible();
    await changePasswordButton.click();

    // 現在 / 新規 / 確認の 3 フィールドを入力する
    const fields = page.locator(SELECTORS.settings.passwordField);
    await expect(fields).toHaveCount(3);
    await page
      .locator(SELECTORS.settings.passwordFieldCurrent)
      .fill(TEST_DATA.password.valid);
    await page.locator(SELECTORS.settings.passwordFieldNew).fill('newpass1234');
    await page
      .locator(SELECTORS.settings.passwordFieldConfirm)
      .fill('newpass1234');

    // 送信する
    await page.locator(SELECTORS.settings.passwordFormSubmit).click();

    // フォームが閉じ、新しいハッシュが保存される
    await expect(fields.first()).toBeHidden();
    const settings = await getStorageData(page, 'settings');
    expect(settings?.password?.enabled).toBe(true);
    expect(settings?.password?.passwordHash).not.toBe(
      TEST_DATA.password.validHash
    );

    await page.close();
  });

  test('OPT-SET05: パスワードを削除できる', async ({
    context,
    extensionId
  }) => {
    // パスワード設定済みのストレージをセットアップ
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    // トグルをオフにするとパスワード保護が解除される
    const toggle = page.locator(SELECTORS.settings.passwordEnableToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();

    // 解除確認のためのパスワード入力を求められる
    const fields = page.locator(SELECTORS.settings.passwordField);
    await expect(fields.first()).toBeVisible();
    await page
      .locator(SELECTORS.settings.passwordFieldCurrent)
      .fill(TEST_DATA.password.valid);
    await page.locator(SELECTORS.settings.passwordFormSubmit).click();

    // 保護が解除される
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    const settings = await getStorageData(page, 'settings');
    expect(settings?.password?.enabled).toBe(false);

    await page.close();
  });

  test('OPT-SET06: 長押しの秒数を変えると、ブロック解除にその秒数の長押しが要る', async ({
    context,
    extensionId
  }) => {
    // 既定（5 秒）と区別でき、かつテストが長くなりすぎない秒数を選ぶ
    const HOLD_SECONDS = 10;
    // 押し始めの記録と描画の遅れで、実測は設定値より少し短く出ることがある
    const MEASUREMENT_SLACK_MS = 1000;
    test.setTimeout(60 * 1000);

    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    // 設定タブの「ブロック解除の保護」で秒数を変える
    await expect(
      page.locator(SELECTORS.settings.unblockProtectionSection)
    ).toBeVisible();
    await page
      .locator(SELECTORS.settings.unblockHoldSecondsSelect)
      .selectOption(String(HOLD_SECONDS));

    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.unblockConfirm?.holdSeconds;
      })
      .toBe(HOLD_SECONDS);

    // ブロックリストタブで項目を無効化しようとすると、変えた秒数の長押しが求められる
    await page.locator(SELECTORS.options.blocklistTab).click();
    const toggle = page.locator(SELECTORS.options.itemToggle).first();
    await toggle.click();

    const modal = page.locator(SELECTORS.modal.unblockConfirm);
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(`${HOLD_SECONDS} seconds`);

    const elapsedMs = await holdUnblockConfirm(page, HOLD_SECONDS);
    expect(elapsedMs).toBeGreaterThanOrEqual(
      HOLD_SECONDS * 1000 - MEASUREMENT_SLACK_MS
    );

    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-SET07: 通知設定を変更できる', async ({ context, extensionId }) => {
    // 通知設定は時間制限つきのサイトが無くても出る。その状態で操作できることを確かめる
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
        blockList: [],
        notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 }
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    const heading = page.getByRole('heading', {
      name: UI_TEXT.notifications.heading
    });
    await expect(heading).toBeVisible();

    // 通知のタイミングを変更する
    await heading.locator('xpath=following::select[1]').selectOption('10');
    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.notifications?.timeLimitMinutes;
      })
      .toBe(10);

    // 通知を切ると、タイミングの選択欄も消える
    const toggle = toggleAfter(heading);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(
      page.getByText(UI_TEXT.notifications.minutesLabel)
    ).toHaveCount(0);

    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.notifications?.timeLimitEnabled;
      })
      .toBe(false);

    await page.close();
  });

  test('OPT-SET08: Analytics Opt-In 設定を変更できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'settings');

    // Analytics Opt-Inトグルが表示される
    const optInToggle = page.locator(SELECTORS.settings.analyticsOptInToggle);
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

  test('OPT-SET09: 設定データをエクスポートできる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'settings');

    // エクスポートボタンが表示される
    const exportButton = page.locator(SELECTORS.settings.exportSettingsButton);
    await expect(exportButton).toBeVisible();

    // エクスポートボタンをクリック（ダウンロードが発生）
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();

    // ダウンロードが開始される
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/vision.*\.json/i);

    await page.close();
  });

  test('OPT-SET10: 設定データをインポートできる', async ({
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

    const page = await openOptions(context, extensionId, 'settings');

    // インポートボタンが表示される
    const importButton = page.locator(SELECTORS.settings.importSettingsButton);
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
    const resultMessage = page.locator(SELECTORS.settings.importResultMessage);
    await expect(resultMessage).toBeVisible();

    // エラーではないことを確認する
    await expect(resultMessage).not.toContainText(/error|失敗|不正/i);

    await page.close();
  });
});
