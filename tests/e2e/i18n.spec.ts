import { test, expect } from './fixtures/extension';
import { openPopup, openNewTab, openOptions } from './helpers/pages';
import { clearStorageFromExtension } from './helpers/storage';
import { setupTestStorageViaSW } from './helpers/sw';
import { SELECTORS } from './helpers/constants';

test.describe('i18n - 多言語対応', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('I18N-001: ブラウザ言語が英語の場合、英語UIが表示される', async ({
    context,
    extensionId
  }) => {
    await setupTestStorageViaSW(context, {});

    const popupPage = await openPopup(context, extensionId);

    await expect(popupPage.locator(SELECTORS.quickBlock.heading)).toHaveText(
      'Block Websites'
    );

    await popupPage.close();
  });

  test('I18N-003: ヘッダーの操作は実装どおりの 3 つだけ', async ({
    context,
    extensionId
  }) => {
    await setupTestStorageViaSW(context, {});

    const popupPage = await openPopup(context, extensionId);

    const implementedControls = [
      SELECTORS.header.pauseToggle,
      SELECTORS.header.settingsButton,
      SELECTORS.header.helpButton
    ];

    const header = popupPage.locator(SELECTORS.header.container);
    await expect(header).toBeVisible();
    await expect(header.locator('button')).toHaveCount(
      implementedControls.length
    );
    for (const selector of implementedControls) {
      await expect(header.locator(selector)).toBeVisible();
    }

    await popupPage.close();
  });
});

test.describe('i18n - ブラウザ言語が日本語', () => {
  test.use({ browserLanguage: 'ja' });

  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('I18N-002: ブラウザ言語が日本語の場合、日本語UIが表示される', async ({
    context,
    extensionId
  }) => {
    await setupTestStorageViaSW(context, {});

    const popupPage = await openPopup(context, extensionId);

    await expect(popupPage.locator(SELECTORS.quickBlock.heading)).toHaveText(
      'サイトをブロック'
    );

    await popupPage.close();
  });

  test('I18N-004: 言語設定が全画面で統一されている', async ({
    context,
    extensionId
  }) => {
    await setupTestStorageViaSW(context, {});

    const popupPage = await openPopup(context, extensionId);
    await expect(popupPage.locator(SELECTORS.quickBlock.heading)).toHaveText(
      'サイトをブロック'
    );
    await popupPage.close();

    const newtabPage = await openNewTab(context, extensionId);
    await expect(newtabPage.locator(SELECTORS.newtab.container)).toBeVisible();
    await newtabPage.close();

    const optionsPage = await openOptions(context, extensionId);
    await expect(optionsPage.locator(SELECTORS.options.title)).toHaveText(
      'ダッシュボード'
    );
    await expect(
      optionsPage.locator(SELECTORS.options.blocklistTab)
    ).toContainText('ブロックリスト');
    await optionsPage.close();
  });
});
