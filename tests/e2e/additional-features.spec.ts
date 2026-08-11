import { test, expect } from './fixtures/extension';
import { openOptions, openNewTab, openStoragePage } from './helpers/pages';
import { SELECTORS } from './helpers/constants';
import {
  clearStorageFromExtension,
  makeAnalytics,
  makeDisplaySettings,
  makePreset,
  setStorageData,
  setupTestStorage
} from './helpers/storage';
import { MAX_PRESETS } from '../../src/constants/limits';

/**
 * E2E Tests: 追加機能（かつて有料版限定だった機能）
 *
 * マネタイズ方針の変更（#337）により全機能が無料で使えるようになった。
 * ライセンス判定は存在しないため、「Premium を有効化してから確認する」という
 * 前提を取り除き、素の状態で使えることを検証する。
 *
 * 対応するテストケース: docs/TEST_CASES.md の「追加機能」
 */

test.describe('追加機能 - 全ユーザーが利用できる', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('PR-002: Google Fonts を選択できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, { language: 'en' });
    await page.close();

    const optionsPage = await openOptions(context, extensionId, 'styles');

    // フォントのカテゴリ・ファミリーが選択できる状態で表示される
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
    await setupTestStorage(page, { language: 'en' });
    await page.close();

    const optionsPage = await openOptions(context, extensionId, 'styles');

    // 背景タイプを画像に切り替えるとアップロード先が現れる
    await optionsPage.click('[data-testid="style-bg-type-image"]');
    await expect(
      optionsPage.locator('[data-testid="style-bg-upload-dropzone"]')
    ).toBeVisible();

    // file input は非表示のまま存在する（ドロップゾーン経由で使う）
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
    await setupTestStorage(page, { withGoal: true, language: 'en' });
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
    await setupTestStorage(setupPage, { language: 'en' });

    // 上限（MAX_PRESETS）ちょうどのスタイルを用意する
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

    // 上限ちょうどまでは全て選択できる（ロックはもう存在しない）
    await expect(page.locator(SELECTORS.styles.presetButton)).toHaveCount(
      MAX_PRESETS
    );
    for (const n of [1, MAX_PRESETS]) {
      const button = page
        .locator(SELECTORS.styles.presetButton)
        .filter({ hasText: new RegExp(`^Preset ${n}$`) });
      await expect(button).toBeEnabled();
      await expect(button.locator('svg.lucide-lock')).toHaveCount(0);
    }

    // 上限に達したら新規作成ボタンは出さない（UI の都合による上限）
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
    await setupTestStorage(setupPage, { language: 'en' });

    // 7 日より前のデータを含む履歴を用意する
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        '2026-01-01': { blockedCount: 3, wastedTime: 0, investedTime: 0 },
        '2026-06-01': { blockedCount: 5, wastedTime: 0, investedTime: 0 }
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // レポートセクションが期間制限なしで表示される
    await expect(
      page.locator('[data-testid="analytics-reports-heading"]')
    ).toBeVisible();

    await page.close();
  });

  test('PR-007: CSV エクスポートが使える', async ({ context, extensionId }) => {
    const setupPage = await openStoragePage(context, extensionId);
    await setupTestStorage(setupPage, { withBlockList: true, language: 'en' });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    const exportButton = page.locator(
      '[data-testid="analytics-export-button"]'
    );
    await expect(exportButton).toBeEnabled();

    // エクスポートはドロップダウンを開いてから項目を選ぶ
    await exportButton.click();

    // クリックより前に待ち受けを開始しないとイベントを取りこぼす
    const downloadPromise = page.waitForEvent('download');
    await page.click(SELECTORS.analytics.exportBlocklist);
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    await page.close();
  });
});
