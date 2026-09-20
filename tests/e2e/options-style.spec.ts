import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeDisplaySettings,
  makePreset,
  getStorageData,
  SELECTORS,
  UI_TEXT
} from './helpers';

/**
 * E2Eテスト: Options - Style Tab
 *
 * OPT-ST01 ~ OPT-ST15 のテストケースを実装
 */

test.describe('Options - Style Tab', () => {
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
    // 適用されていないプリセットを 1 件用意する。
    // 既定のプリセットは最初から適用済みで、適用ボタンが出ない
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: makeDisplaySettings(),
      presets: [
        makePreset('default', 'Default'),
        makePreset('second', 'Second', { goalText: 'Second Goal' })
      ],
      activePresetId: 'default'
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    // 未適用のプリセットを選択する
    await page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Second' })
      .click();

    // 選択中のプリセットが未適用なので適用ボタンが出る
    const applyButton = page.locator(SELECTORS.styles.applyButton);
    await expect(applyButton).toBeVisible();
    await expect(applyButton).toHaveText(UI_TEXT.styles.applyPreset);

    await applyButton.click();

    // 有効なプリセットが切り替わる。
    // activePresetId を書き換えるのは適用の経路だけ（usePresets の
    // handleApplyPreset）なので、ここを待てば適用されたことになる
    await expect
      .poll(async () => (await getStorageData(page, 'vision'))?.activePresetId)
      .toBe('second');

    // 適用後は適用ボタンが消え、適用済みの表示に変わる
    await expect(applyButton).toHaveCount(0);
    await expect(
      page.getByText(UI_TEXT.styles.activePreset, { exact: true })
    ).toBeVisible();

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
    await page.locator(SELECTORS.styles.newPresetNameInput).fill('Test Preset');

    // 作成ボタンをクリック
    await page.locator(SELECTORS.styles.newPresetConfirm).click();

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
      defaultSettings: makeDisplaySettings(),
      presets: [
        makePreset('default', 'Default'),
        makePreset('test-preset', 'Test Preset', {
          goalText: 'Test Goal',
          goalSubText: 'Test Sub',
          textColor: '#000000',
          backgroundColor: '#ffffff'
        })
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

  test('OPT-ST10: カスタム画像をアップロードできる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // カスタム背景アップロードのドロップゾーンが表示される
    // （ファイル入力自体は hidden なので可視要素で確認する）
    await expect(
      page.locator(SELECTORS.styles.customBackgroundDropzone)
    ).toBeVisible();
    await expect(
      page.locator(SELECTORS.styles.customBackgroundUpload)
    ).toBeAttached();

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

  test('OPT-ST12: Google Fonts を選択できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    // デフォルトプリセットを選択
    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    // フォントはカテゴリ選択 + ファミリ選択のボタン群で構成される
    const categoryButtons = page.locator(SELECTORS.styles.fontCategoryButton);
    await expect(categoryButtons.first()).toBeVisible();

    // System 以外のカテゴリ（Google Fonts 系）が選択できる
    // （count() は自動リトライしないため poll で待つ）
    await expect.poll(() => categoryButtons.count()).toBeGreaterThan(1);

    // 2 番目のカテゴリを選ぶとファミリ候補が表示される
    await categoryButtons.nth(1).click();
    const familyButtons = page.locator(SELECTORS.styles.fontFamilySelect);
    await expect(familyButtons.first()).toBeVisible();
    await expect.poll(() => familyButtons.count()).toBeGreaterThan(1);

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

    // フォントサイズはボタン群で選ぶ（select ではない）。
    // 文言はコード内の定数で i18n を通らない
    // （src/components/features/FontPicker/FontPicker.tsx の FONT_SIZES）
    const previewText = preview.locator('p').first();
    const sizeButtons = page.locator(SELECTORS.styles.fontSizeButton);

    // 既定のプリセットは lg（36px）で作られている
    await expect(previewText).toHaveCSS('font-size', '36px');

    // Small を選ぶとプレビューが 24px になる
    // （src/constants/fonts.ts の FONT_SIZE_PX）
    await sizeButtons.filter({ hasText: UI_TEXT.font.sizeSmall }).click();
    await expect(previewText).toHaveCSS('font-size', '24px');

    // Large に戻すと 36px に戻る（一方向の変化だけを見て終わらせない）
    await sizeButtons
      .filter({ hasText: new RegExp(`^${UI_TEXT.font.sizeLarge}$`) })
      .click();
    await expect(previewText).toHaveCSS('font-size', '36px');

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
});
