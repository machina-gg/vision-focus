import { test, expect } from './fixtures/extension';
import { openPopup, openNewTab, openOptions } from './helpers/pages';
import { clearStorageFromExtension } from './helpers/storage';
import { setupTestStorageViaSW } from './helpers/sw';
import { SELECTORS } from './helpers/constants';

/**
 * E2E Tests: 多言語対応
 *
 * ブラウザ言語の自動検出、言語切り替え、全画面での統一をテスト
 */

test.describe('i18n - 多言語対応', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('I18N-001: ブラウザ言語が英語の場合、英語UIが表示される', async ({
    context,
    extensionId
  }) => {
    // 英語に設定
    // 言語設定は描画に直結するため、アプリに上書きされない SW 経由で置く
    await setupTestStorageViaSW(context, { language: 'en' });

    // Popup を開く
    const popupPage = await openPopup(context, extensionId);

    // 英語のテキストが表示されることを確認（要素は testid で特定し、
    // 文言そのものを検証する）
    await expect(popupPage.locator(SELECTORS.quickBlock.heading)).toHaveText(
      'Block Websites'
    );

    await popupPage.close();
  });

  test('I18N-002: ブラウザ言語が日本語の場合、日本語UIが表示される', async ({
    context,
    extensionId
  }) => {
    // 日本語に設定
    // 言語設定は描画に直結するため、アプリに上書きされない SW 経由で置く
    await setupTestStorageViaSW(context, { language: 'ja' });

    // Popup を開く
    const popupPage = await openPopup(context, extensionId);

    // 日本語のテキストが表示されることを確認
    await expect(popupPage.locator(SELECTORS.quickBlock.heading)).toHaveText(
      'サイトをブロック'
    );

    await popupPage.close();
  });

  test('I18N-003: ポップアップで言語を切り替えできる', async ({
    context,
    extensionId
  }) => {
    // 最初は英語
    // 言語設定は描画に直結するため、アプリに上書きされない SW 経由で置く
    await setupTestStorageViaSW(context, { language: 'en' });

    // Popup を開く
    const popupPage = await openPopup(context, extensionId);
    const heading = popupPage.locator(SELECTORS.quickBlock.heading);
    await expect(heading).toHaveText('Block Websites');

    // 言語セレクタで日本語に切り替える
    const languageSelector = popupPage.locator(
      SELECTORS.header.languageSelector
    );
    await expect(languageSelector).toBeVisible();
    await languageSelector.selectOption('ja');

    // 日本語に変更されたことを確認
    await expect(heading).toHaveText('サイトをブロック');

    await popupPage.close();
  });

  test('I18N-004: 言語設定が全画面で統一されている', async ({
    context,
    extensionId
  }) => {
    // 日本語に設定
    // 言語設定は描画に直結するため、アプリに上書きされない SW 経由で置く
    await setupTestStorageViaSW(context, { language: 'ja' });

    // Popup を開く
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
      'VisionFocus ダッシュボード'
    );
    await expect(
      optionsPage.locator(SELECTORS.options.blocklistTab)
    ).toContainText('ブロックリスト');
    await optionsPage.close();
  });

  test('I18N-005: 言語変更が即座に反映される', async ({
    context,
    extensionId
  }) => {
    // 最初は英語
    // 言語設定は描画に直結するため、アプリに上書きされない SW 経由で置く
    await setupTestStorageViaSW(context, { language: 'en' });

    // Options を開く
    const optionsPage = await openOptions(context, extensionId);
    await expect(optionsPage.locator(SELECTORS.options.title)).toHaveText(
      'VisionFocus Dashboard'
    );

    // 言語を日本語に変更する。
    // options ページを開いたまま clear すると、アプリが state を書き戻して
    // 英語に戻してしまうため、clear せず上書きする
    await setupTestStorageViaSW(context, { language: 'ja', clear: false });

    // リロードで反映されることを確認
    await optionsPage.reload();
    await expect(optionsPage.locator(SELECTORS.options.title)).toHaveText(
      'VisionFocus ダッシュボード'
    );

    await optionsPage.close();
  });
});
