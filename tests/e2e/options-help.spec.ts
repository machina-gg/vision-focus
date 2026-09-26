import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  SELECTORS,
  UI_TEXT
} from './helpers';

/**
 * E2Eテスト: Options - Help Tab
 *
 * OPT-H01 ~ OPT-H03 のテストケースを実装
 */

test.describe('Options - Help Tab', () => {
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

  test('OPT-H01: ヘルプタブが表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'help');

    // ヘルプタブが表示される
    await expect(page.locator(SELECTORS.options.helpTab)).toBeVisible();

    // はじめにセクションが表示される
    await expect(page.locator(SELECTORS.help.gettingStarted)).toBeVisible();

    await page.close();
  });

  test('OPT-H02: 基本的な使い方が表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'help');

    // はじめにセクションが表示される
    const gettingStarted = page.locator(SELECTORS.help.gettingStarted);
    await expect(gettingStarted).toBeVisible();

    // 使い方の手順が並ぶ。
    // h3 の数を数えるだけだと、別セクションの見出しがあれば中身が
    // 空でも通るため、手順の見出しを 1 つずつ確かめる
    for (const step of UI_TEXT.help.gettingStartedSteps) {
      await expect(
        page.getByRole('heading', { level: 3, name: step, exact: true })
      ).toBeVisible();
    }

    await page.close();
  });

  test('OPT-H03: FAQ が表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'help');

    // FAQセクションが表示される
    const faq = page.locator(SELECTORS.help.faq);
    await expect(faq).toBeVisible();

    // FAQ項目が表示される
    // （count() は自動リトライしないため、描画の待機は expect に任せる）
    const faqItems = page.locator(SELECTORS.help.faqItem);
    await expect(faqItems.first()).toBeVisible();

    // FAQ項目をクリックして展開できる
    await faqItems.first().click();

    // 展開された内容が表示される
    const openedItem = faqItems.first();
    await expect(openedItem).toHaveAttribute('open', '');

    await page.close();
  });
});
