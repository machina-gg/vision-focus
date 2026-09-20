import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  setStorageData,
  getStorageData,
  clearStorage,
  makeDisplaySettings,
  makePreset,
  SELECTORS
} from './helpers';

/**
 * E2Eテスト: NewTab 画面 - 目標編集
 *
 * NEW-006, NEW-007 のテストケースを実装
 */

test.describe('NewTab 画面 - 目標編集', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openNewTab(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });

    // 編集ボタンは「プリセットを適用していない」ときだけ描画される
    // （src/entrypoints/newtab/App.tsx の canEdit={!vision?.activePresetId}）。
    // setupTestStorage は activePresetId: 'default' を書くため、
    // そのままでは編集ボタンが存在せず目標編集を一度も操作できない
    await setStorageData(page, 'vision', {
      defaultSettings: makeDisplaySettings(),
      presets: [makePreset('default', 'Default')],
      activePresetId: null
    });
    await page.close();
  });

  test('NEW-006: 目標テキストをダブルクリックで編集モードになる', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 目標テキストを探す
    const goalText = page.locator(SELECTORS.newtab.goalText);
    await expect(goalText).toBeVisible();

    // 編集ボタンが表示されるまでホバー
    await goalText.hover();

    // 編集ボタンをクリックすると編集モードに入る
    await page.locator(SELECTORS.newtab.goalEditButton).click();

    // 入力フィールドと保存・キャンセルのボタンが表示される
    await expect(page.locator(SELECTORS.newtab.goalInput)).toBeVisible();
    await expect(page.locator(SELECTORS.newtab.goalSaveButton)).toBeVisible();
    await expect(page.locator(SELECTORS.newtab.goalCancelButton)).toBeVisible();

    // 編集中は見出しが入力フィールドに置き換わる
    await expect(page.locator(SELECTORS.newtab.goalText)).toHaveCount(0);

    await page.close();
  });

  test('NEW-007: 編集した目標がEnterキーで保存される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 目標テキストにホバーして編集ボタンを表示
    const goalText = page.locator(SELECTORS.newtab.goalText);
    await goalText.hover();

    // 編集ボタンをクリック
    await page.locator(SELECTORS.newtab.goalEditButton).click();

    // 入力フィールドに新しいテキストを入力
    const input = page.locator(SELECTORS.newtab.goalInput);
    await input.fill('新しい目標テキスト');

    // Enter キーで保存
    await input.press('Enter');

    // 編集モードが終了し、新しいテキストが表示される
    await expect(page.locator(SELECTORS.newtab.goalInput)).toHaveCount(0);
    await expect(page.locator(SELECTORS.newtab.goalText)).toHaveText(
      '新しい目標テキスト'
    );

    // 保存先は vision.defaultSettings.goalText
    // （src/entrypoints/newtab/App.tsx の handleSaveGoal）
    await expect
      .poll(async () => {
        const vision = await getStorageData(page, 'vision');
        return vision?.defaultSettings?.goalText;
      })
      .toBe('新しい目標テキスト');

    await page.close();
  });
});
