import { test, expect } from './fixtures/extension';
import { openOptions, openNewTab, openStoragePage } from './helpers/pages';
import { SELECTORS } from './helpers/constants';
import {
  clearStorageFromExtension,
  makeActivity,
  makeDisplaySettings,
  makePreset,
  setStorageData,
  setupTestStorage
} from './helpers/storage';
import { MAX_PRESETS } from '../../src/constants/limits';

test.describe('追加機能 - 全ユーザーが利用できる', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('PR-002: Google Fonts を選択できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, {});
    await page.close();

    const optionsPage = await openOptions(context, extensionId, 'styles');

    await expect(
      optionsPage.locator('[data-testid="font-category-button"]').first()
    ).toBeVisible();
    await expect(
      optionsPage.locator('[data-testid="font-family-button"]').first()
    ).toBeEnabled();

    await optionsPage.close();
  });

  test('PR-003: カスタム背景画像をアップロードできる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, {});
    await page.close();

    const optionsPage = await openOptions(context, extensionId, 'styles');

    await optionsPage.click('[data-testid="style-bg-type-image"]');
    await expect(
      optionsPage.locator('[data-testid="style-bg-upload-dropzone"]')
    ).toBeVisible();

    await expect(
      optionsPage.locator('[data-testid="style-bg-upload"]')
    ).toHaveCount(1);

    await optionsPage.close();
  });

  test('PR-004: 壁紙ダウンロードボタンが使える', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, { withGoal: true });
    await page.close();

    const newtab = await openNewTab(context, extensionId);

    await expect(
      newtab.locator('[data-testid="newtab-download-button"]')
    ).toBeEnabled();

    await newtab.close();
  });

  test('PR-005: スタイルを上限まで作成できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {});

    await setStorageData(setupPage, 'vision', {
      defaultSettings: makeDisplaySettings(),
      presets: Array.from({ length: MAX_PRESETS }, (_, i) =>
        makePreset(`preset${i + 1}`, `Preset ${i + 1}`, {
          goalText: `Goal ${i + 1}`,
          goalSubText: `Sub ${i + 1}`
        })
      ),
      activePresetId: 'preset1'
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    await expect(page.locator(SELECTORS.styles.presetButton)).toHaveCount(
      MAX_PRESETS
    );
    for (const n of [1, MAX_PRESETS]) {
      const button = page
        .locator(SELECTORS.styles.presetButton)
        .filter({ hasText: new RegExp(`^Preset ${n}$`) });
      await expect(button).toBeEnabled();
      await button.click();
      await expect(page.locator(SELECTORS.styles.goalTextInput)).toHaveValue(
        `Goal ${n}`
      );
    }

    await expect(
      page.locator('[data-testid="style-new-preset-button"]')
    ).toHaveCount(0);

    await page.close();
  });

  test('PR-006: Analytics で全期間のレポートが確認できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openStoragePage(context, extensionId);
    await setupTestStorage(setupPage, { withBlockList: true });
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([
        ['example.com', { blocks: 3 }, 60],
        ['example.com', { blocks: 5 }, 10]
      ])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    await expect(
      page.locator('[data-testid="analytics-reports-heading"]')
    ).toBeVisible();

    await page.close();
  });

  test('PR-007: CSV エクスポートが使える', async ({ context, extensionId }) => {
    const setupPage = await openStoragePage(context, extensionId);
    await setupTestStorage(setupPage, { withBlockList: true });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    const exportButton = page.locator(
      '[data-testid="analytics-export-button"]'
    );
    await expect(exportButton).toBeEnabled();

    await exportButton.click();

    // クリックより前に待ち受けを開始しないとイベントを取りこぼす
    const downloadPromise = page.waitForEvent('download');
    await page.click(SELECTORS.analytics.exportBlocklist);
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    await page.close();
  });
});
