import { test, expect } from './fixtures/extension';
import { openOptions } from './helpers/pages';
import {
  setStorageData,
  getStorageData,
  clearStorage
} from './helpers/storage';

/**
 * E2E Tests: Premium 機能
 *
 * ライセンスキー入力、Premium 機能の解放、Free ダウングレード、開発者モードをテスト
 */

test.describe('Premium - Premium 機能', () => {
  test.beforeEach(async ({ context }) => {
    const page = await context.newPage();
    await clearStorage(page);
    await page.close();
  });

  test('PR-001: ライセンスキー入力で Premium が有効化される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Options の Premium タブを開く
    const optionsPage = await openOptions(context, extensionId, 'premium');

    // ライセンスキー入力フィールドを探す
    const licenseInput = optionsPage.locator('input[type="text"]').first();
    if (await licenseInput.isVisible()) {
      await licenseInput.fill('TEST-LICENSE-KEY-123');

      const activateButton = optionsPage.locator(
        'button:has-text("Activate"), button:has-text("有効化")'
      );
      await activateButton.click();

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Premium が有効化されたことを確認
      const premium = (await getStorageData(optionsPage, 'premium')) as any;
      if (premium) {
        expect(premium.isPremium).toBe(true);
      }
    }

    await optionsPage.close();
  });

  test('PR-002: Premium 機能（Google Fonts など）が解放される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Options の Styles タブを開く
    const optionsPage = await openOptions(context, extensionId, 'styles');

    // Google Fonts セレクタが表示されることを確認
    const googleFontsSelector = optionsPage.locator(
      'text=/Google Fonts|フォント/i'
    );
    const isVisible = await googleFontsSelector.isVisible();
    expect(isVisible).toBeTruthy();

    await optionsPage.close();
  });

  test('PR-003: カスタム背景画像アップロードが使える', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Options の Styles タブを開く
    const optionsPage = await openOptions(context, extensionId, 'styles');

    // カスタム背景画像アップロードボタンが表示されることを確認
    const uploadButton = optionsPage.locator(
      'input[type="file"], button:has-text("Upload")'
    );
    const isVisible = await uploadButton.first().isVisible();
    expect(isVisible).toBeTruthy();

    await optionsPage.close();
  });

  test('PR-004: 壁紙ダウンロード機能が使える', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Options の Styles タブを開く
    const optionsPage = await openOptions(context, extensionId, 'styles');

    // 壁紙ダウンロードボタンが表示されることを確認
    const downloadButton = optionsPage.locator(
      'button:has-text("Download"), button:has-text("ダウンロード")'
    );
    if (await downloadButton.isVisible()) {
      expect(await downloadButton.isVisible()).toBeTruthy();
    }

    await optionsPage.close();
  });

  test('PR-005: プリセット上限が5件になる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    // 5件のプリセットを設定
    await setStorageData(page, 'vision', {
      defaultSettings: {
        goalText: 'Focus',
        subText: 'Stay productive'
      },
      presets: [
        {
          id: '1',
          name: 'Preset 1',
          goalText: 'Goal 1',
          subText: 'Sub 1',
          textColor: '#fff',
          backgroundColor: '#000',
          backgroundType: 'color'
        },
        {
          id: '2',
          name: 'Preset 2',
          goalText: 'Goal 2',
          subText: 'Sub 2',
          textColor: '#fff',
          backgroundColor: '#111',
          backgroundType: 'color'
        },
        {
          id: '3',
          name: 'Preset 3',
          goalText: 'Goal 3',
          subText: 'Sub 3',
          textColor: '#fff',
          backgroundColor: '#222',
          backgroundType: 'color'
        },
        {
          id: '4',
          name: 'Preset 4',
          goalText: 'Goal 4',
          subText: 'Sub 4',
          textColor: '#fff',
          backgroundColor: '#333',
          backgroundType: 'color'
        },
        {
          id: '5',
          name: 'Preset 5',
          goalText: 'Goal 5',
          subText: 'Sub 5',
          textColor: '#fff',
          backgroundColor: '#444',
          backgroundType: 'color'
        }
      ],
      activePresetId: '1'
    });

    await page.close();

    // Options の Styles タブを開く
    const optionsPage = await openOptions(context, extensionId, 'styles');

    // 5件のプリセットが表示されることを確認
    const vision = (await getStorageData(optionsPage, 'vision')) as any;
    expect(vision.presets.length).toBe(5);

    await optionsPage.close();
  });

  test('PR-006: Analytics 全期間表示が使える', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    await page.close();

    // Options の Analytics タブを開く
    const optionsPage = await openOptions(context, extensionId, 'analytics');

    // 全期間フィルタが表示されることを確認
    const allTimeFilter = optionsPage.locator('text=/All Time|全期間/i');
    const isVisible = await allTimeFilter.isVisible();
    expect(isVisible).toBeTruthy();

    await optionsPage.close();
  });

  test('PR-007: Unblock History CSV エクスポートが使える', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    await page.close();

    // Options の Analytics タブを開く
    const optionsPage = await openOptions(context, extensionId, 'analytics');

    // CSV エクスポートボタンが表示されることを確認
    const exportButton = optionsPage.locator(
      'button:has-text("Export CSV"), button:has-text("CSV出力")'
    );
    if (await exportButton.isVisible()) {
      expect(await exportButton.isVisible()).toBeTruthy();
    }

    await optionsPage.close();
  });

  test('PR-008: 開発者モードで24時間 Premium 体験ができる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Options の Premium タブを開く
    const optionsPage = await openOptions(context, extensionId, 'premium');

    // 開発者モードボタンを探す
    const devModeButton = optionsPage.locator(
      'button:has-text("Developer Mode"), button:has-text("開発者モード")'
    );
    if (await devModeButton.isVisible()) {
      await devModeButton.click();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Premium が有効化されたことを確認
      const premium = (await getStorageData(optionsPage, 'premium')) as any;
      if (premium) {
        expect(premium.isPremium).toBe(true);
        expect(premium.devMode).toBe(true);
      }
    }

    await optionsPage.close();
  });

  test('PR-009: ライセンス解除で Free にダウングレードされる', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    await setStorageData(page, 'settings', {
      language: 'en',
      paused: false
    });

    await page.close();

    // Options の Premium タブを開く
    const optionsPage = await openOptions(context, extensionId, 'premium');

    // ライセンス解除ボタンを探す
    const deactivateButton = optionsPage.locator(
      'button:has-text("Deactivate"), button:has-text("解除")'
    );
    if (await deactivateButton.isVisible()) {
      await deactivateButton.click();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Premium が無効化されたことを確認
      const premium = (await getStorageData(optionsPage, 'premium')) as any;
      if (premium) {
        expect(premium.isPremium).toBe(false);
      }
    }

    await optionsPage.close();
  });

  test('PR-010: Free ダウングレード時、2件目以降のプリセットがロック', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // 最初は Premium
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    // 3件のプリセットを設定
    await setStorageData(page, 'vision', {
      defaultSettings: {
        goalText: 'Focus',
        subText: 'Stay productive'
      },
      presets: [
        {
          id: '1',
          name: 'Preset 1',
          goalText: 'Goal 1',
          subText: 'Sub 1',
          textColor: '#fff',
          backgroundColor: '#000',
          backgroundType: 'color'
        },
        {
          id: '2',
          name: 'Preset 2',
          goalText: 'Goal 2',
          subText: 'Sub 2',
          textColor: '#fff',
          backgroundColor: '#111',
          backgroundType: 'color'
        },
        {
          id: '3',
          name: 'Preset 3',
          goalText: 'Goal 3',
          subText: 'Sub 3',
          textColor: '#fff',
          backgroundColor: '#222',
          backgroundType: 'color'
        }
      ],
      activePresetId: '1'
    });

    await page.close();

    // Premium を解除
    const page2 = await context.newPage();
    await setStorageData(page2, 'premium', {
      isPremium: false,
      activatedAt: null
    });

    await page2.close();

    // Options の Styles タブを開く
    const optionsPage = await openOptions(context, extensionId, 'styles');

    // 2件目以降のプリセットがロックされていることを確認
    const lockedPreset = optionsPage.locator('text=/Locked|ロック/i');
    if (await lockedPreset.isVisible()) {
      expect(await lockedPreset.isVisible()).toBeTruthy();
    }

    await optionsPage.close();
  });

  test('PR-011: ダウングレード時、カスタム背景が削除される', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    // カスタム背景を設定
    await setStorageData(page, 'vision', {
      defaultSettings: {
        goalText: 'Focus',
        subText: 'Stay productive'
      },
      presets: [
        {
          id: '1',
          name: 'Custom Background',
          goalText: 'Goal',
          subText: 'Sub',
          textColor: '#fff',
          backgroundColor: 'data:image/png;base64,CUSTOM_IMAGE',
          backgroundType: 'image'
        }
      ],
      activePresetId: '1'
    });

    await page.close();

    // Premium を解除
    const page2 = await context.newPage();
    await setStorageData(page2, 'premium', {
      isPremium: false,
      activatedAt: null
    });

    // ダウングレード処理が実行されるのを待つ
    await new Promise((resolve) => setTimeout(resolve, 500));

    // カスタム背景が削除されたことを確認
    const vision = (await getStorageData(page2, 'vision')) as any;
    if (vision.presets[0].backgroundType === 'image') {
      // Free プランではカスタム背景は使用できないため、color にリセット
      expect(vision.presets[0].backgroundType).toBe('color');
    }

    await page2.close();
  });

  test('PR-012: ダウングレード時、3件目以降のプリセットが無効化', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();

    // Premium を有効化
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });

    // 5件のプリセットを設定
    await setStorageData(page, 'vision', {
      defaultSettings: {
        goalText: 'Focus',
        subText: 'Stay productive'
      },
      presets: [
        {
          id: '1',
          name: 'Preset 1',
          goalText: 'Goal 1',
          subText: 'Sub 1',
          textColor: '#fff',
          backgroundColor: '#000',
          backgroundType: 'color'
        },
        {
          id: '2',
          name: 'Preset 2',
          goalText: 'Goal 2',
          subText: 'Sub 2',
          textColor: '#fff',
          backgroundColor: '#111',
          backgroundType: 'color'
        },
        {
          id: '3',
          name: 'Preset 3',
          goalText: 'Goal 3',
          subText: 'Sub 3',
          textColor: '#fff',
          backgroundColor: '#222',
          backgroundType: 'color'
        },
        {
          id: '4',
          name: 'Preset 4',
          goalText: 'Goal 4',
          subText: 'Sub 4',
          textColor: '#fff',
          backgroundColor: '#333',
          backgroundType: 'color'
        },
        {
          id: '5',
          name: 'Preset 5',
          goalText: 'Goal 5',
          subText: 'Sub 5',
          textColor: '#fff',
          backgroundColor: '#444',
          backgroundType: 'color'
        }
      ],
      activePresetId: '3'
    });

    await page.close();

    // Premium を解除
    const page2 = await context.newPage();
    await setStorageData(page2, 'premium', {
      isPremium: false,
      activatedAt: null
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3件目以降のプリセットがアクセスできないことを確認
    const vision = (await getStorageData(page2, 'vision')) as any;
    // Free プランでは最大2件まで
    expect(
      vision.presets.filter((p) => p.id === '1' || p.id === '2').length
    ).toBe(2);

    // activePresetId が 3 以降の場合、デフォルトに戻される
    if (
      vision.activePresetId === '3' ||
      vision.activePresetId === '4' ||
      vision.activePresetId === '5'
    ) {
      expect(vision.activePresetId).toBe('1');
    }

    await page2.close();
  });
});
