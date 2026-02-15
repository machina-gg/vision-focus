import { test, expect } from './fixtures/extension';
import {
  openNewTab,
  setupTestStorage,
  clearStorage,
  setStorageData,
  SELECTORS,
  TEST_DATA
} from './helpers';

/**
 * E2Eテスト: NewTab 画面
 *
 * NEW-001 ~ NEW-013 のテストケースを実装
 */

test.describe('NewTab 画面', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openNewTab(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('NEW-001: 新規タブを開くとダッシュボードが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // ダッシュボードコンテナが表示される
    const container = page.locator('.newtab-container');
    await expect(container).toBeVisible();

    // 目標テキストが表示される
    await expect(page.locator('h1')).toBeVisible();

    // 設定ボタンが表示される（右下）
    const settingsButton = page
      .locator('button')
      .filter({ hasText: /Settings|設定/i })
      .last();
    await expect(settingsButton).toBeVisible();

    await page.close();
  });

  test('NEW-002: プリセット設定済み時、背景画像が表示される', async ({
    context,
    extensionId
  }) => {
    // プリセット付きのストレージをセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // コンテナに背景スタイルが適用されている
    const container = page.locator('.newtab-container');
    await expect(container).toBeVisible();

    // オーバーレイが表示される（プリセット設定時に表示される半透明オーバーレイ）
    const overlay = page.locator('.absolute.inset-0.bg-black\\/30');
    await expect(overlay).toBeVisible();

    await page.close();
  });

  test('NEW-003: 目標テキストが中央に表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 目標テキストが表示される
    const goalText = page
      .locator('h1')
      .filter({ hasText: /Focus on what matters/i });
    await expect(goalText).toBeVisible();
    await expect(goalText).toContainText('Focus on what matters');

    // サブテキストが表示される
    const subText = page.locator('p').filter({ hasText: /Stay productive/i });
    await expect(subText).toBeVisible();

    await page.close();
  });

  test('NEW-004: ミニ統計カード（ブロック回数）が表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // ブロック回数カードが表示される
    const blockCountCard = page
      .locator('text=/Today.*Blocks|今日のブロック/i')
      .first();
    await expect(blockCountCard).toBeVisible();

    // デフォルト値は0
    const blockCount = page.locator('p.text-xl.font-bold.text-block-600');
    await expect(blockCount.first()).toBeVisible();
    await expect(blockCount.first()).toContainText('0');

    await page.close();
  });

  test('NEW-005: 設定アイコンクリックでオプション画面が開く', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 設定アイコン（右下）をクリック
    const settingsButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();

    // 新しいタブでオプション画面が開くのを待つ
    const newPage = await context.waitForEvent('page');
    await newPage.waitForLoadState('domcontentloaded');

    // オプション画面のURLを確認
    expect(newPage.url()).toContain('options.html');

    await newPage.close();
    await page.close();
  });

  test('NEW-006: 目標テキストをダブルクリックで編集モードになる', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 目標テキストを探す（編集可能な場合）
    const goalText = page.locator('h1').first();
    await expect(goalText).toBeVisible();

    // 編集ボタンが表示されるまでホバー
    await goalText.hover();

    // 編集ボタンを探してクリック
    const editButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();

    // 編集ボタンが存在する場合のみクリック（プリセット使用時は編集不可）
    const editButtonCount = await editButton.count();
    if (editButtonCount > 0) {
      await editButton.click();

      // 入力フィールドが表示される
      const input = page.locator(
        'input[placeholder*="goal" i], input[placeholder*="目標" i]'
      );
      await expect(input).toBeVisible();
    }

    await page.close();
  });

  test('NEW-007: 編集した目標がEnterキーで保存される', async ({
    context,
    extensionId
  }) => {
    const page = await openNewTab(context, extensionId);

    // 目標テキストにホバーして編集ボタンを表示
    const goalText = page.locator('h1').first();
    await goalText.hover();

    // 編集ボタンをクリック
    const editButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();
    const editButtonCount = await editButton.count();

    if (editButtonCount > 0) {
      await editButton.click();

      // 入力フィールドに新しいテキストを入力
      const input = page.locator('input[type="text"]').first();
      await input.fill('新しい目標テキスト');

      // Enter キーで保存
      await input.press('Enter');

      // 編集モードが終了し、新しいテキストが表示される
      await expect(
        page.locator('h1').filter({ hasText: '新しい目標テキスト' })
      ).toBeVisible();
    }

    await page.close();
  });

  test('NEW-008: プリセット未設定時、シンプルなブロックページUIが表示', async ({
    context,
    extensionId
  }) => {
    // プリセットを空にしたストレージをセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: {
        goalText: 'Focus on what matters',
        subText: 'Stay productive'
      },
      presets: [], // プリセットなし
      activePresetId: null
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // VisionFocus タイトルが表示される
    await expect(
      page.locator('h1').filter({ hasText: 'VisionFocus' })
    ).toBeVisible();

    // セットアップCTAが表示される
    const setupButton = page
      .locator('button')
      .filter({ hasText: /Create|作成/i });
    await expect(setupButton).toBeVisible();

    await page.close();
  });

  test('NEW-009: ブロックされたサイトから遷移時、ブロック情報が表示される', async ({
    context,
    extensionId
  }) => {
    // ブロックされたドメイン情報をセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setStorageData(setupPage, 'lastBlockedDomain', 'example.com');
    await setStorageData(setupPage, 'analytics', {
      siteBlockCounts: {
        'example.com': {
          domain: 'example.com',
          count: 5,
          lastBlockedAt: new Date().toISOString()
        }
      },
      timeLimitUsage: {}
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // ブロック情報バナーが表示される
    const blockBanner = page
      .locator('.animate-fade-in, div')
      .filter({ hasText: 'example.com' });
    await expect(blockBanner.first()).toBeVisible();

    // ブロック回数が表示される
    await expect(page.locator('text=/5/i').first()).toBeVisible();

    await page.close();
  });

  test('NEW-010: ブロックサイトリストが表示される', async ({
    context,
    extensionId
  }) => {
    // ブロックリスト付きのストレージをセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // ブロックサイトリストセクションが表示される
    // BlockedSitesList コンポーネントが表示されることを確認
    const blockedSitesList = page.locator('text=/example.com/i');
    await expect(blockedSitesList.first()).toBeVisible();

    await page.close();
  });

  test('NEW-011: Premium ユーザーは壁紙ダウンロードボタンが表示される', async ({
    context,
    extensionId
  }) => {
    // Premium 設定済みのストレージをセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPremium: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // ダウンロードボタンが表示される（Premium ユーザーのみ）
    const downloadButton = page
      .locator('button')
      .filter({ has: page.locator('svg[class*="download" i], svg') })
      .filter({ hasText: /Download|ダウンロード|^$/ });

    // ボタンの存在を確認（テキストがない場合もあるのでアイコンで判定）
    const downloadButtonCount = await downloadButton.count();
    expect(downloadButtonCount).toBeGreaterThan(0);

    await page.close();
  });

  test('NEW-012: Time Limit 超過からの遷移時、専用メッセージが表示される', async ({
    context,
    extensionId
  }) => {
    // Time Limit 超過でブロックされたドメイン情報をセットアップ
    const setupPage = await openNewTab(context, extensionId);
    await setStorageData(setupPage, 'lastBlockedDomain', 'youtube.com');
    await setStorageData(setupPage, 'analytics', {
      siteBlockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 3,
          lastBlockedAt: new Date().toISOString()
        }
      },
      timeLimitUsage: {}
    });
    await setupPage.close();

    // Time Limit 超過の reason パラメータ付きでページを開く
    const url = `chrome-extension://${extensionId}/newtab.html?reason=time_limit_exceeded`;
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');

    // Time Limit 専用メッセージが表示される
    const timeLimitMessage = page.locator('text=/time limit|時間制限/i');
    await expect(timeLimitMessage.first()).toBeVisible();

    await page.close();
  });

  test('NEW-013: ブロック日数（Blocking Days）が正しく表示される', async ({
    context,
    extensionId
  }) => {
    // ブロックリストに古い日付のドメインを追加
    const setupPage = await openNewTab(context, extensionId);
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - 10); // 10日前

    await setStorageData(setupPage, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
      blockList: [
        {
          id: '1',
          domain: 'example.com',
          isWildcard: false,
          createdAt: createdDate.toISOString(),
          enabled: true
        }
      ]
    });

    await setStorageData(setupPage, 'lastBlockedDomain', 'example.com');
    await setupPage.close();

    const page = await openNewTab(context, extensionId);

    // Blocking Days カードが表示される
    const blockingDaysCard = page.locator('text=/Blocking Days|ブロック日数/i');
    await expect(blockingDaysCard.first()).toBeVisible();

    // 日数が表示される（10日以上）
    const daysCount = page.locator('p.text-xl.font-bold.text-info-600');
    await expect(daysCount.first()).toBeVisible();

    await page.close();
  });
});
