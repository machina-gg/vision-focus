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

test.describe('Options - Style Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
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

    await expect(page.locator(SELECTORS.options.stylesTab)).toBeVisible();

    await expect(page.locator(SELECTORS.styles.presetSelector)).toBeVisible();

    await page.close();
  });

  test('OPT-ST02: プリセット一覧が表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    const presetButtons = page.locator(SELECTORS.styles.presetButton);
    await expect(presetButtons.first()).toBeVisible();
    await expect(presetButtons.first()).toContainText('Default');

    await page.close();
  });

  test('OPT-ST03: プリセットを選択・適用できる', async ({
    context,
    extensionId
  }) => {
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

    await page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Second' })
      .click();

    const applyButton = page.locator(SELECTORS.styles.applyButton);
    await expect(applyButton).toBeVisible();
    await expect(applyButton).toHaveText(UI_TEXT.styles.applyPreset);

    await applyButton.click();

    await expect
      .poll(async () => (await getStorageData(page, 'vision'))?.activePresetId)
      .toBe('second');

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

    const createButton = page
      .locator(SELECTORS.styles.createPresetButton)
      .or(page.locator(SELECTORS.styles.createFirstPresetButton));
    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await page.locator(SELECTORS.styles.newPresetNameInput).fill('Test Preset');

    await page.locator(SELECTORS.styles.newPresetConfirm).click();

    await expect(modal).not.toBeVisible();

    const newPreset = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Test Preset' });
    await expect(newPreset).toBeVisible();

    await page.close();
  });

  test('OPT-ST05: プリセットを削除できる', async ({ context, extensionId }) => {
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

    const testPreset = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Test Preset' });
    await testPreset.click();

    const deleteButton = page.locator(SELECTORS.styles.deleteButton);
    await deleteButton.click();

    await expect(testPreset).not.toBeVisible();

    await page.close();
  });

  test('OPT-ST06: 目標テキスト・サブテキストを入力できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const goalInput = page.locator(SELECTORS.styles.goalTextInput);
    await goalInput.fill('My New Goal');
    await expect(goalInput).toHaveValue('My New Goal');

    const subTextArea = page.locator(SELECTORS.styles.goalSubTextArea);
    await subTextArea.fill('My subtitle');
    await expect(subTextArea).toHaveValue('My subtitle');

    await page.close();
  });

  test('OPT-ST07: テキスト色を選択できる', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'styles');

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const colorPicker = page.locator(SELECTORS.styles.textColorPicker).first();
    await colorPicker.fill('#ff0000');

    await expect(colorPicker).toHaveValue('#ff0000');

    await page.close();
  });

  test('OPT-ST08: 背景タイプ（画像/単色）を選択できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const colorButton = page.locator(SELECTORS.styles.backgroundTypeColor);
    await colorButton.click();

    await expect(colorButton).toHaveClass(/bg-info-500/);

    const imageButton = page.locator(SELECTORS.styles.backgroundTypeImage);
    await imageButton.click();

    await expect(imageButton).toHaveClass(/bg-info-500/);

    await page.close();
  });

  test('OPT-ST09: デフォルト背景画像を選択できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const imageButton = page.locator(SELECTORS.styles.backgroundTypeImage);
    await imageButton.click();

    const imageOptions = page.locator(SELECTORS.styles.backgroundImageOption);
    await expect(imageOptions.first()).toBeVisible();

    await imageOptions.first().click();

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

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

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

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const fontSection = page.locator(
      'h2:has-text("Font"), h2:has-text("フォント")'
    );
    await expect(fontSection).toBeVisible();

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

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const categoryButtons = page.locator(SELECTORS.styles.fontCategoryButton);
    await expect(categoryButtons.first()).toBeVisible();

    // count() は自動リトライしないため poll で待つ
    await expect.poll(() => categoryButtons.count()).toBeGreaterThan(1);

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

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const preview = page.locator(SELECTORS.styles.preview);
    await expect(preview).toBeVisible();

    const imageButton = page.locator(SELECTORS.styles.backgroundTypeImage);
    await imageButton.click();

    const imageOptions = page.locator(SELECTORS.styles.backgroundImageOption);
    await imageOptions.first().click();

    const previewStyle = await preview.getAttribute('style');
    expect(previewStyle).toContain('background');

    await page.close();
  });

  test('OPT-ST14: フォント変更時にリアルタイムプレビューされる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const preview = page.locator(SELECTORS.styles.preview);
    await expect(preview).toBeVisible();

    const previewText = preview.locator('p').first();
    const sizeButtons = page.locator(SELECTORS.styles.fontSizeButton);

    await expect(previewText).toHaveCSS('font-size', '36px');

    await sizeButtons.filter({ hasText: UI_TEXT.font.sizeSmall }).click();
    await expect(previewText).toHaveCSS('font-size', '24px');

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

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' });
    await presetButton.click();

    const preview = page.locator(SELECTORS.styles.preview);
    await expect(preview).toBeVisible();

    const colorPicker = page.locator(SELECTORS.styles.textColorPicker).first();
    await colorPicker.fill('#ff0000');

    const previewText = preview.locator('p').first();
    const color = await previewText.evaluate(
      (el) => window.getComputedStyle(el).color
    );
    expect(color).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000/i);

    await page.close();
  });
});
