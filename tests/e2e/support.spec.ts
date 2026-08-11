import { expect } from '@playwright/test';

import { test } from './fixtures/extension';
import { openOptions, setupTestStorage } from './helpers';
import { SELECTORS } from './helpers/constants';

/**
 * 開発支援（Buy Me a Coffee）の導線
 *
 * SUP-001〜: ヘルプタブの常設セクションと、レポート下の誘導（頻度制御あり）
 */
test.describe('Support development', () => {
  test('SUP-001: ヘルプタブに支援セクションが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, { withAnalyticsOptIn: true });
    await page.reload();

    await page.click(SELECTORS.options.helpTab);

    await expect(
      page.locator('[data-testid="support-section-title"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="support-button"]').first()
    ).toBeVisible();
  });

  test('SUP-002: 支援ボタンで Buy Me a Coffee のページが開く', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, { withAnalyticsOptIn: true });
    await page.reload();
    await page.click(SELECTORS.options.helpTab);

    // クリックより前に待ち受けを開始しないとイベントを取りこぼす
    const newPagePromise = context.waitForEvent('page');
    await page.locator('[data-testid="support-button"]').first().click();
    const newPage = await newPagePromise;

    expect(newPage.url()).toContain('buymeacoffee.com');
  });

  test('SUP-003: 分析タブのレポート下に支援誘導が表示され、閉じると消える', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, { withAnalyticsOptIn: true });
    await page.reload();

    await page.click(SELECTORS.options.analyticsTab);

    const prompt = page.locator('[data-testid="support-prompt"]');
    await expect(prompt).toBeVisible();

    await page.click('[data-testid="support-prompt-dismiss"]');
    await expect(prompt).toBeHidden();
  });

  test('SUP-004: 一度閉じるとリロード後も再表示されない', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId);
    await setupTestStorage(page, { withAnalyticsOptIn: true });
    await page.reload();

    await page.click(SELECTORS.options.analyticsTab);
    await page.click('[data-testid="support-prompt-dismiss"]');

    await page.reload();
    await page.click(SELECTORS.options.analyticsTab);

    // 30 日の猶予期間内なので再表示されない
    await expect(page.locator('[data-testid="support-prompt"]')).toBeHidden();
  });

  test('SUP-005: 新規タブには支援導線を置かない', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/newtab.html`);
    await page.waitForLoadState('domcontentloaded');

    // 集中させる画面なので、外部リンクへの離脱経路を作らない
    await expect(page.locator('[data-testid="support-button"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="support-prompt"]')).toHaveCount(0);
  });
});
