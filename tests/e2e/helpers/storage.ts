import type { BrowserContext, Page } from '@playwright/test';

/**
 * chrome.storage.local のテストデータ設定・取得ヘルパー
 *
 * E2Eテストで chrome.storage.local を直接操作するためのユーティリティ
 */

/**
 * chrome.storage.local にデータをセットする
 *
 * @param page - Playwright Page オブジェクト
 * @param key - ストレージキー
 * @param value - セットする値
 */
export async function setStorageData(
  page: Page,
  key: string,
  value: unknown
): Promise<void> {
  await page.evaluate(
    async ({ key, value }) => {
      await chrome.storage.local.set({ [key]: value });
    },
    { key, value }
  );
}

/**
 * chrome.storage.local からデータを取得する
 *
 * @param page - Playwright Page オブジェクト
 * @param key - ストレージキー
 * @returns 取得した値
 */
export async function getStorageData<T = unknown>(
  page: Page,
  key: string
): Promise<T | null> {
  return page.evaluate(async (key) => {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }, key);
}

/**
 * chrome.storage.local をクリアする
 *
 * @param page - Playwright Page オブジェクト
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await chrome.storage.local.clear();
  });
}

/**
 * テスト用の初期設定をセットする
 *
 * @param page - Playwright Page オブジェクト
 * @param options - テストオプション
 */
export async function setupTestStorage(
  page: Page,
  options: {
    withGoal?: boolean;
    withBlockList?: boolean;
    withPassword?: boolean;
    withPremium?: boolean;
    withAnalyticsOptIn?: boolean;
  } = {}
): Promise<void> {
  const {
    withGoal = true,
    withBlockList = false,
    withPassword = false,
    withPremium = false,
    withAnalyticsOptIn = true
  } = options;

  // デフォルト設定
  const defaultSettings = {
    language: 'en',
    paused: false,
    analyticsOptIn: withAnalyticsOptIn
      ? { enabled: true, decidedAt: new Date().toISOString() }
      : null
  };

  if (withPassword) {
    // パスワードハッシュ（"test1234" の SHA-256）
    defaultSettings['password'] = {
      passwordHash:
        '1b4f0e9851971998e732078544c96b36c3d01cedf7caa332359d6f1d83567014'
    };
  }

  await setStorageData(page, 'settings', defaultSettings);

  // Vision 設定（目標テキスト）
  if (withGoal) {
    const defaultVision = {
      defaultSettings: {
        goalText: 'Focus on what matters',
        subText: 'Stay productive'
      },
      presets: [
        {
          id: 'default',
          name: 'Default',
          goalText: 'Focus on what matters',
          subText: 'Stay productive',
          textColor: '#ffffff',
          backgroundColor: '#1a1a2e',
          backgroundType: 'color'
        }
      ],
      activePresetId: 'default'
    };
    await setStorageData(page, 'vision', defaultVision);
  }

  // ブロックリスト
  if (withBlockList) {
    const blockList = [
      {
        id: '1',
        domain: 'example.com',
        isWildcard: false,
        createdAt: new Date().toISOString(),
        enabled: true
      }
    ];
    await setStorageData(page, 'blockList', blockList);
  }

  // Premium 設定
  if (withPremium) {
    await setStorageData(page, 'premium', {
      isPremium: true,
      activatedAt: new Date().toISOString()
    });
  }
}
