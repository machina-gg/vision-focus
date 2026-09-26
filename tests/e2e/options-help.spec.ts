import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  SELECTORS,
  UI_TEXT
} from './helpers';

test.describe('Options - Help Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
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

    await expect(page.locator(SELECTORS.options.helpTab)).toBeVisible();

    await expect(page.locator(SELECTORS.help.gettingStarted)).toBeVisible();

    await page.close();
  });

  test('OPT-H02: 基本的な使い方が表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'help');

    const gettingStarted = page.locator(SELECTORS.help.gettingStarted);
    await expect(gettingStarted).toBeVisible();

    for (const step of UI_TEXT.help.gettingStartedSteps) {
      await expect(
        page.getByRole('heading', { level: 3, name: step, exact: true })
      ).toBeVisible();
    }

    await page.close();
  });

  test('OPT-H03: FAQ が表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'help');

    const faq = page.locator(SELECTORS.help.faq);
    await expect(faq).toBeVisible();

    // count() は自動リトライしないため、描画の待機は expect に任せる
    const faqItems = page.locator(SELECTORS.help.faqItem);
    await expect(faqItems.first()).toBeVisible();

    await faqItems.first().click();

    const openedItem = faqItems.first();
    await expect(openedItem).toHaveAttribute('open', '');

    await page.close();
  });
});
