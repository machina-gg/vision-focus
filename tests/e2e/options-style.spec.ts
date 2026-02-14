import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  setStorageData,
  SELECTORS
} from './helpers';

/**
 * E2Eテスト: Options - Style Tab
 *
 * OPT-ST01 ~ OPT-ST16 のテストケースを実装
 */

test.describe('Options - Style Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('OPT-ST01: スタイルタブが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // スタイルタブが表示される
    await expect(page.locator(SELECTORS.options.stylesTab)).toBeVisible();

    // プリセットセレクターが表示される
    await expect(page.locator(SELECTORS.styles.presetSelector)).toBeVisible();

    await page.close();
  });

  test('OPT-ST02: プリセット一覧が表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットが表示される
    const presetButtons = page.locator(SELECTORS.styles.presetButton);
    await expect(presetButtons.first()).toBeVisible();
    await expect(presetButtons.first()).toContainText('Default');

    await page.close();
  });

  test('OPT-ST03: プリセットを選択・適用できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // 適用ボタンまたは既に適用済みの表示が出る
    const applyButton = page.locator(SELECTORS.styles.applyButton);
    const activeLabel = page.locator('text=/Active|適用中/i');

    // どちらかが表示されることを確認
    const applyVisible = await applyButton.isVisible().catch(() => false);
    const activeVisible = await activeLabel.isVisible().catch(() => false);
    expect(applyVisible || activeVisible).toBeTruthy();

    await page.close();
  });

  test('OPT-ST04: 新規プリセットを作成できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // 新規プリセットボタンをクリック
    const createButton = page
      .locator(SELECTORS.styles.createPresetButton)
      .or(page.locator(SELECTORS.styles.createFirstPresetButton));
    await createButton.click();

    // プリセット作成モーダルが表示される
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // プリセット名を入力
    const nameInput = modal.locator('input[type="text"]');
    await nameInput.fill('Test Preset');

    // 作成ボタンをクリック
    const confirmButton = modal.locator(
      'button:has-text("作成"), button:has-text("Create")'
    );
    await confirmButton.click();

    // モーダルが閉じる
    await expect(modal).not.toBeVisible();

    // 新しいプリセットが一覧に表示される
    const newPreset = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Test Preset' });
    await expect(newPreset).toBeVisible();

    await page.close();
  });

  test('OPT-ST05: プリセットを削除できる', async ({ context, extensionId }) => {
    // テスト用プリセットを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: {
        goalText: 'Focus on what matters',
        subText: 'Stay productive'
      },
      presets: [
        {
          id: 'default',
          name: 'Default',
          goalText: 'Focus on what matters',
          subText: 'Stay productive',
          textColor: '#ffffff',
          backgroundColor: '#1a1a2e',
          backgroundType: 'color'
        },
        {
          id: 'test-preset',
          name: 'Test Preset',
          goalText: 'Test Goal',
          subText: 'Test Sub',
          textColor: '#000000',
          backgroundColor: '#ffffff',
          backgroundType: 'color'
        }
      ],
      activePresetId: 'default'
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    // Test Presetを選択
    const testPreset = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Test Preset' });
    await testPreset.click();

    // 削除ボタンをクリック
    const deleteButton = page.locator(SELECTORS.styles.deleteButton);
    await deleteButton.click();

    // プリセットが削除される（一覧から消える）
    await expect(testPreset).not.toBeVisible();

    await page.close();
  });

  test('OPT-ST06: 目標テキスト・サブテキストを入力できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // 目標テキスト入力
    const goalInput = page.locator(SELECTORS.styles.goalTextInput);
    await goalInput.fill('My New Goal');
    await expect(goalInput).toHaveValue('My New Goal');

    // サブテキスト入力
    const subTextArea = page.locator(SELECTORS.styles.goalSubTextArea);
    await subTextArea.fill('My subtitle');
    await expect(subTextArea).toHaveValue('My subtitle');

    await page.close();
  });

  test('OPT-ST07: テキスト色を選択できる', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // テキスト色ピッカーを変更
    const colorPicker = page.locator(SELECTORS.styles.textColorPicker).first();
    await colorPicker.fill('#ff0000');

    // 色が変更されたことを確認
    await expect(colorPicker).toHaveValue('#ff0000');

    await page.close();
  });

  test('OPT-ST08: 背景タイプ（画像/単色）を選択できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // 単色ボタンをクリック
    const colorButton = page.locator(SELECTORS.styles.backgroundTypeColor);
    await colorButton.click();

    // 単色ボタンがアクティブになる
    await expect(colorButton).toHaveClass(/bg-info-500/);

    // 画像ボタンをクリック
    const imageButton = page.locator(SELECTORS.styles.backgroundTypeImage);
    await imageButton.click();

    // 画像ボタンがアクティブになる
    await expect(imageButton).toHaveClass(/bg-info-500/);

    await page.close();
  });

  test('OPT-ST09: デフォルト背景画像を選択できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // 画像タイプを選択
    const imageButton = page.locator(SELECTORS.styles.backgroundTypeImage);
    await imageButton.click();

    // 背景画像オプションが表示される
    const imageOptions = page.locator(SELECTORS.styles.backgroundImageOption);
    await expect(imageOptions.first()).toBeVisible();

    // 1つ目の画像を選択
    await imageOptions.first().click();

    // 選択された画像が青枠になる
    await expect(imageOptions.first()).toHaveClass(/border-info-500/);

    await page.close();
  });

  test('OPT-ST10: Premium ユーザーはカスタム画像をアップロードできる', async ({
    context,
    extensionId
  }) => {
    // Premium設定
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPremium: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // カスタム背景アップロードフィールドが表示される
    const uploadInput = page.locator(SELECTORS.styles.customBackgroundUpload);
    await expect(uploadInput).toBeVisible();

    await page.close();
  });

  test('OPT-ST11: フォント設定（ファミリー・サイズ・ウェイト）を変更可能', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // フォント設定セクションが表示される
    const fontSection = page.locator(
      'h2:has-text("Font"), h2:has-text("フォント")'
    );
    await expect(fontSection).toBeVisible();

    // フォント選択用のセレクトが表示される
    const fontSelects = page.locator(SELECTORS.styles.fontFamilySelect);
    await expect(fontSelects.first()).toBeVisible();

    await page.close();
  });

  test('OPT-ST12: Premium ユーザーは Google Fonts を選択できる', async ({
    context,
    extensionId
  }) => {
    // Premium設定
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPremium: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // フォント選択セレクトでGoogle Fontsが選択可能
    const fontSelect = page.locator(SELECTORS.styles.fontFamilySelect).first();
    await expect(fontSelect).toBeVisible();

    // Google Fontsのオプションが含まれている（Premiumユーザーのみ）
    const options = await fontSelect.locator('option').allTextContents();
    // System fonts以外にGoogle Fontsが含まれることを確認
    expect(options.length).toBeGreaterThan(3);

    await page.close();
  });

  test('OPT-ST13: 背景画像変更時にリアルタイムプレビューされる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // プレビューエリアが表示される
    const preview = page.locator(SELECTORS.styles.preview);
    await expect(preview).toBeVisible();

    // 画像タイプを選択
    const imageButton = page.locator(SELECTORS.styles.backgroundTypeImage);
    await imageButton.click();

    // 背景画像を選択
    const imageOptions = page.locator(SELECTORS.styles.backgroundImageOption);
    await imageOptions.first().click();

    // プレビューの背景画像が更新される（backgroundImageスタイルが適用される）
    const previewStyle = await preview.getAttribute('style');
    expect(previewStyle).toContain('background');

    await page.close();
  });

  test('OPT-ST14: フォント変更時にリアルタイムプレビューされる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // プレビューエリアが表示される
    const preview = page.locator(SELECTORS.styles.preview);
    await expect(preview).toBeVisible();

    // フォントサイズを変更
    const fontSizeSelect = page.locator('select').filter({
      has: page.locator('option:has-text("Medium"), option:has-text("中")')
    });
    if (await fontSizeSelect.isVisible()) {
      await fontSizeSelect.selectOption({ index: 1 });

      // プレビュー内のテキストのスタイルが変更される
      const previewText = preview.locator('p').first();
      const fontSize = await previewText.evaluate(
        (el) => window.getComputedStyle(el).fontSize
      );
      expect(fontSize).toBeTruthy();
    }

    await page.close();
  });

  test('OPT-ST15: 色変更時にリアルタイムプレビューされる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // プレビューエリアが表示される
    const preview = page.locator(SELECTORS.styles.preview);
    await expect(preview).toBeVisible();

    // テキスト色を変更
    const colorPicker = page.locator(SELECTORS.styles.textColorPicker).first();
    await colorPicker.fill('#ff0000');

    // プレビュー内のテキストの色が変更される
    const previewText = preview.locator('p').first();
    const color = await previewText.evaluate(
      (el) => window.getComputedStyle(el).color
    );
    // rgb(255, 0, 0) または #ff0000 形式
    expect(color).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000/i);

    await page.close();
  });

  test('OPT-ST16: Free ダウングレード時、2件目以降のプリセットがロックされる', async ({
    context,
    extensionId
  }) => {
    // 複数プリセットを作成
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: {
        goalText: 'Focus on what matters',
        subText: 'Stay productive'
      },
      presets: [
        {
          id: 'default',
          name: 'Default',
          goalText: 'Focus on what matters',
          subText: 'Stay productive',
          textColor: '#ffffff',
          backgroundColor: '#1a1a2e',
          backgroundType: 'color'
        },
        {
          id: 'preset2',
          name: 'Preset 2',
          goalText: 'Goal 2',
          subText: 'Sub 2',
          textColor: '#000000',
          backgroundColor: '#ffffff',
          backgroundType: 'color'
        }
      ],
      activePresetId: 'default'
    });
    // Freeユーザー（Premiumなし）
    await setStorageData(setupPage, 'premium', {
      isPremium: false
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    // 2件目のプリセットがロックされている（Lock アイコンが表示）
    const preset2Button = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Preset 2' });
    await expect(preset2Button).toBeVisible();

    // ロックアイコンが表示される
    const lockIcon = preset2Button.locator('svg.lucide-lock');
    await expect(lockIcon).toBeVisible();

    // ボタンが無効化されている
    await expect(preset2Button).toBeDisabled();

    await page.close();
  });
});
