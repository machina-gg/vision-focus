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

test.describe('NewTab 画面 - 目標編集', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await openNewTab(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });

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

    const goalText = page.locator(SELECTORS.newtab.goalText);
    await expect(goalText).toBeVisible();

    await goalText.hover();

    await page.locator(SELECTORS.newtab.goalEditButton).click();

    await expect(page.locator(SELECTORS.newtab.goalInput)).toBeVisible();
    await expect(page.locator(SELECTORS.newtab.goalSaveButton)).toBeVisible();
    await expect(page.locator(SELECTORS.newtab.goalCancelButton)).toBeVisible();

    await expect(page.locator(SELECTORS.newtab.goalText)).toHaveCount(0);

    await page.close();
  });

  test('NEW-007: 編集した目標がEnterキーで保存される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    const goalText = page.locator(SELECTORS.newtab.goalText);
    await goalText.hover();

    await page.locator(SELECTORS.newtab.goalEditButton).click();

    const input = page.locator(SELECTORS.newtab.goalInput);
    await input.fill('新しい目標テキスト');

    await input.press('Enter');

    await expect(page.locator(SELECTORS.newtab.goalInput)).toHaveCount(0);
    await expect(page.locator(SELECTORS.newtab.goalText)).toHaveText(
      '新しい目標テキスト'
    );

    await expect
      .poll(async () => {
        const vision = await getStorageData(page, 'vision');
        return vision?.defaultSettings?.goalText;
      })
      .toBe('新しい目標テキスト');

    await page.close();
  });
});
