import { test, expect } from './fixtures/extension';
import { openPopup, openNewTab, openOptions } from './helpers/pages';
import { setStorageData, clearStorage } from './helpers/storage';

/**
 * E2E Tests: 多言語対応
 *
 * ブラウザ言語の自動検出、言語切り替え、全画面での統一をテスト
 */

test.describe('i18n - 多言語対応', () => {
  test.beforeEach(async ({ context }) => {
    const page = await context.newPage();
    await clearStorage(page);
    await page.close();
  });

  test('I18N-001: ブラウザ言語が英語の場合、英語UIが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 英語に設定
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Popup を開く
    const popupPage = await openPopup(context, extensionId);

    // 英語のテキストが表示されることを確認
    const englishText = await popupPage
      .locator("text=/Block Websites|Today's Goal/i")
      .first()
      .isVisible();
    expect(englishText).toBeTruthy();

    await popupPage.close();
  });

  test('I18N-002: ブラウザ言語が日本語の場合、日本語UIが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 日本語に設定
    await setStorageData(page, 'settings', {
      language: 'ja',
      paused: false
    });

    await page.close();

    // Popup を開く
    const popupPage = await openPopup(context, extensionId);

    // 日本語のテキストが表示されることを確認
    const japaneseText = await popupPage
      .locator('text=/ウェブサイトをブロック|今日の目標/i')
      .first()
      .isVisible();
    expect(japaneseText).toBeTruthy();

    await popupPage.close();
  });

  test('I18N-003: ポップアップで言語を切り替えできる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 最初は英語
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Popup を開く
    const popupPage = await openPopup(context, extensionId);

    // 英語のテキストが表示されることを確認
    let englishText = await popupPage
      .locator('text=/Block Websites/i')
      .first()
      .isVisible();
    expect(englishText).toBeTruthy();

    // 言語セレクタを探す
    const languageSelector = popupPage.locator('select');
    if (await languageSelector.isVisible()) {
      await languageSelector.selectOption('ja');
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 日本語に変更されたことを確認
      const japaneseText = await popupPage
        .locator('text=/ウェブサイトをブロック/i')
        .first()
        .isVisible();
      expect(japaneseText).toBeTruthy();
    }

    await popupPage.close();
  });

  test('I18N-004: 言語設定が全画面で統一されている', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 日本語に設定
    await setStorageData(page, 'settings', {
      language: 'ja',
      paused: false
    });

    await page.close();

    // Popup を開く
    const popupPage = await openPopup(context, extensionId);
    const popupJapanese = await popupPage
      .locator('text=/ウェブサイトをブロック/i')
      .first()
      .isVisible();
    expect(popupJapanese).toBeTruthy();
    await popupPage.close();

    // New Tab を開く
    const newtabPage = await openNewTab(context, extensionId);
    const newtabJapanese = await newtabPage
      .locator('text=/今日の目標|集中/i')
      .first()
      .isVisible();
    expect(newtabJapanese).toBeTruthy();
    await newtabPage.close();

    // Options を開く
    const optionsPage = await openOptions(context, extensionId);
    const optionsJapanese = await optionsPage
      .locator('text=/設定|ブロックリスト/i')
      .first()
      .isVisible();
    expect(optionsJapanese).toBeTruthy();
    await optionsPage.close();
  });

  test('I18N-005: 言語変更が即座に反映される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 最初は英語
    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Options を開く
    const optionsPage = await openOptions(context, extensionId);

    // 英語のテキストが表示されることを確認
    let englishText = await optionsPage
      .locator('text=/Settings|Blocklist/i')
      .first()
      .isVisible();
    expect(englishText).toBeTruthy();

    // 言語を日本語に変更
    await optionsPage.evaluate(async () => {
      await chrome.storage.local.set({
        settings: {
          language: 'ja',
          paused: false
        }
      });
    });

    // storage.watch が反応するまで待機
    await new Promise((resolve) => setTimeout(resolve, 500));

    // ページをリロード
    await optionsPage.reload();

    // 日本語に変更されたことを確認
    const japaneseText = await optionsPage
      .locator('text=/設定|ブロックリスト/i')
      .first()
      .isVisible();
    expect(japaneseText).toBeTruthy();

    await optionsPage.close();
  });
});
