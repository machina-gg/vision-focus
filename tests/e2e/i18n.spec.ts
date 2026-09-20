import { test, expect } from './fixtures/extension';
import { openPopup, openNewTab, openOptions } from './helpers/pages';
import { clearStorageFromExtension } from './helpers/storage';
import { setupTestStorageViaSW } from './helpers/sw';
import { SELECTORS } from './helpers/constants';

/**
 * E2E Tests: 多言語対応
 *
 * 表示言語は chrome.i18n がブラウザの言語設定から決める
 * （machina-gg/vision-focus#401）。拡張機能側に言語切替は無いため、
 * 言語を変えるにはブラウザの起動言語（`--lang`）を変える。
 */

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

    // 英語のテキストが表示されることを確認（要素は testid で特定し、
    // 文言そのものを検証する）
    await expect(popupPage.locator(SELECTORS.quickBlock.heading)).toHaveText(
      'Block Websites'
    );

    await popupPage.close();
  });

  test('I18N-003: 言語切替 UI を持たない', async ({ context, extensionId }) => {
    await setupTestStorageViaSW(context, {});

    const popupPage = await openPopup(context, extensionId);

    // ヘッダーは描画されているが、言語セレクタは存在しない
    await expect(popupPage.locator(SELECTORS.header.container)).toBeVisible();
    await expect(
      popupPage.locator('[data-testid="language-selector"]')
    ).toHaveCount(0);

    await popupPage.close();
  });
});

test.describe('i18n - ブラウザ言語が日本語', () => {
  // ブラウザを日本語で起動する（拡張機能の表示言語はここでしか変えられない）
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

    // New Tab を開く
    const newtabPage = await openNewTab(context, extensionId);
    // 新規タブは目標テキスト自体が表示されるため、日本語UIの確認は
    // ブロックサイトリストの見出し（トグル）で行う
    await expect(newtabPage.locator(SELECTORS.newtab.container)).toBeVisible();
    await newtabPage.close();

    // Options を開く
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
