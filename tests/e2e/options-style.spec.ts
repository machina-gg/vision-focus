import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeDisplaySettings,
  makePreset,
  getStorageData,
  getBackgroundImageIds,
  setBackgroundImage,
  openNewTab,
  loadFontFaceStatuses,
  TINY_JPEG_BASE64,
  TINY_JPEG_DATA_URL,
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

    const familySelect = page.locator(SELECTORS.styles.fontFamilySelect);
    await familySelect.selectOption('lora');
    await expect(familySelect).toHaveValue('lora');

    const sizeSmall = page
      .locator(SELECTORS.styles.fontSizeButton)
      .filter({ hasText: UI_TEXT.font.sizeSmall });
    await sizeSmall.click();
    await expect(sizeSmall).toHaveAttribute('aria-pressed', 'true');

    const weightButtons = page.locator(SELECTORS.styles.fontWeightButton);
    await expect(weightButtons).toHaveText([
      UI_TEXT.font.weightNormal,
      UI_TEXT.font.weightBold
    ]);

    const weightNormal = weightButtons.filter({
      hasText: UI_TEXT.font.weightNormal
    });
    await weightNormal.click();
    await expect(weightNormal).toHaveAttribute('aria-pressed', 'true');

    await page.close();
  });

  test('OPT-ST12: 同梱フォントをプルダウンから選択でき、外部から読み込まない', async ({
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

    const familySelect = page.locator(SELECTORS.styles.fontFamilySelect);
    await familySelect.selectOption({ label: 'Noto Sans JP' });
    await expect(familySelect).toHaveValue('notosansjp');

    await expect(
      page.locator(SELECTORS.styles.preview).locator('p').first()
    ).toHaveCSS('font-family', /Noto Sans JP/);
    await expect(
      page.locator('link[rel="stylesheet"][href^="http"]')
    ).toHaveCount(0);
    // 拡張に同梱したファイルが読めること（宣言が無ければ空、読めなければ例外になる）
    const statuses = await loadFontFaceStatuses(
      page,
      "700 16px 'Noto Sans JP'",
      '目標'
    );
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every((status) => status === 'loaded')).toBe(true);

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

    await expect(previewText).toHaveCSS('font-size', '48px');

    await sizeButtons.filter({ hasText: UI_TEXT.font.sizeSmall }).click();
    await expect(previewText).toHaveCSS('font-size', '30px');

    await sizeButtons
      .filter({ hasText: new RegExp(`^${UI_TEXT.font.sizeLarge}$`) })
      .click();
    await expect(previewText).toHaveCSS('font-size', '48px');

    await page
      .locator(SELECTORS.styles.fontFamilySelect)
      .selectOption({ label: 'Lora' });
    await expect(previewText).toHaveCSS('font-family', /Lora/);

    await page
      .locator(SELECTORS.styles.fontWeightButton)
      .filter({ hasText: UI_TEXT.font.weightNormal })
      .click();
    await expect(previewText).toHaveCSS('font-weight', '400');

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

  test('OPT-ST17: 別画面で増えたスタイルが一覧に出て、保存しても消えない', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: makeDisplaySettings(),
      presets: [makePreset('default', 'Default')],
      activePresetId: 'default'
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    await page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' })
      .click();
    const goalInput = page.locator(SELECTORS.styles.goalTextInput);
    await goalInput.fill('Draft Goal');

    const otherPage = await openOptions(context, extensionId);
    const current = await getStorageData(otherPage, 'vision');
    if (!current) throw new Error('vision が保存されていない');
    await setStorageData(otherPage, 'vision', {
      ...current,
      presets: [...current.presets, makePreset('added', 'Added Elsewhere')]
    });
    await otherPage.close();

    await expect(
      page
        .locator(SELECTORS.styles.presetButton)
        .filter({ hasText: 'Added Elsewhere' })
    ).toBeVisible();
    await expect(goalInput).toHaveValue('Draft Goal');

    await page.locator(SELECTORS.styles.saveButton).click();

    await expect
      .poll(async () => {
        const vision = await getStorageData(page, 'vision');
        return vision?.presets.map((p) => [p.id, p.goalText]);
      })
      .toEqual([
        ['default', 'Draft Goal'],
        ['added', 'Focus on what matters']
      ]);

    await page.close();
  });

  test('OPT-ST18: 画像を付けて保存したスタイルが新しいタブに出る', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'styles');

    await page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'Default' })
      .click();
    await page.locator(SELECTORS.styles.backgroundTypeImage).click();
    await page.locator(SELECTORS.styles.customBackgroundUpload).setInputFiles({
      name: 'background.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(TINY_JPEG_BASE64, 'base64')
    });
    await expect(page.locator(SELECTORS.styles.preview)).toHaveAttribute(
      'style',
      /data:image\/jpeg;base64,/
    );

    await page.locator(SELECTORS.styles.saveButton).click();

    // スタイルが指す画像が 1 枚だけ保存され、持ち主のいない画像が無い
    await expect
      .poll(async () => {
        const vision = await getStorageData(page, 'vision');
        const imageId = vision?.presets.find(
          (p) => p.id === 'default'
        )?.customBackgroundId;
        const stored = await getBackgroundImageIds(page);
        return imageId != null && stored.length === 1 && stored[0] === imageId;
      })
      .toBe(true);
    await page.close();

    const newtab = await openNewTab(context, extensionId);
    await expect(newtab.locator(SELECTORS.newtab.container)).toHaveAttribute(
      'style',
      /background-image: url\("data:image\/jpeg;base64,/
    );
    await newtab.close();
  });

  test('OPT-ST19: スタイルを消すと画像の保存キーも消える', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: makeDisplaySettings(),
      presets: [
        makePreset('default', 'Default'),
        makePreset('with-image', 'With Image', {
          backgroundType: 'image',
          customBackgroundId: 'img-delete'
        })
      ],
      activePresetId: 'default'
    });
    await setBackgroundImage(setupPage, 'img-delete', TINY_JPEG_DATA_URL);
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');
    expect(await getBackgroundImageIds(page)).toEqual(['img-delete']);

    const target = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'With Image' });
    await target.click();
    await page.locator(SELECTORS.styles.deleteButton).click();

    await expect(target).not.toBeVisible();
    await expect.poll(() => getBackgroundImageIds(page)).toEqual([]);

    await page.close();
  });
});
