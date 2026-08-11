import type { Page, BrowserContext } from '@playwright/test';
import { TEST_DATA } from './constants';

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
  // アプリは @plasmohq/storage 経由で読み書きしており、値は JSON 文字列として
  // 保存される。生のオブジェクトを書き込むとアプリ側から読み取れず、
  // テストが用意したデータが一切反映されないため、同じ形式で保存する
  await page.evaluate(
    async ({ key, value }) => {
      await chrome.storage.local.set({ [key]: value });
    },
    { key, value: JSON.stringify(value) }
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
    const raw = result[key];
    if (raw === undefined || raw === null) return null;

    // @plasmohq/storage は値を JSON 文字列で保存する。
    // 旧データやテストが直接書いたオブジェクトも読めるよう両方に対応する
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  }, key);
}

/**
 * chrome.storage.local をクリアする
 *
 * @param page - Playwright Page オブジェクト（拡張機能コンテキストのページである必要がある）
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await chrome.storage.local.clear();
  });
}

/**
 * 拡張機能のオプションページを開いて chrome.storage.local をクリアする
 * beforeEach で使用するためのヘルパー関数
 *
 * @param context - BrowserContext
 * @param extensionId - 拡張機能ID
 */
export async function clearStorageFromExtension(
  context: BrowserContext,
  extensionId: string
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');
  await clearStorage(page);
  await page.close();
}

/**
 * 拡張機能のオプションページを開いて chrome.storage.local にデータをセットする
 * テスト内で使用するためのヘルパー関数
 *
 * @param context - BrowserContext
 * @param extensionId - 拡張機能ID
 * @param key - ストレージキー
 * @param value - セットする値
 */
export async function setStorageDataFromExtension(
  context: BrowserContext,
  extensionId: string,
  key: string,
  value: unknown
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');
  await setStorageData(page, key, value);
  await page.close();
}

/**
 * 拡張機能のオプションページを開いて chrome.storage.local からデータを取得する
 * テスト内で使用するためのヘルパー関数
 *
 * @param context - BrowserContext
 * @param extensionId - 拡張機能ID
 * @param key - ストレージキー
 * @returns 取得した値
 */
export async function getStorageDataFromExtension<T = unknown>(
  context: BrowserContext,
  extensionId: string,
  key: string
): Promise<T | null> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');
  const result = await getStorageData<T>(page, key);
  await page.close();
  return result;
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

  // デフォルト設定。
  // AppSettings の必須フィールドを欠くと、実装側で settings.blockList.length の
  // ような参照が例外になる（アプリはストレージに保存済みの値をそのまま使う）。
  // 実装のスキーマと同じ形を必ず満たすこと
  const defaultSettings = {
    blockList: [],
    schedules: [],
    language: 'en',
    paused: false,
    notifications: {
      timeLimitEnabled: true,
      timeLimitMinutes: 5
    },
    youtube: {
      enabled: false,
      blockAccess: false,
      hideShorts: false,
      hideRecommendations: false,
      hideComments: false,
      timeLimit: null
    },
    password: {
      enabled: false,
      passwordHash: null
    },
    analyticsOptIn: withAnalyticsOptIn
      ? { enabled: true, decidedAt: new Date().toISOString() }
      : null
  };

  // パスワード保護は enabled と passwordHash の両方が必要
  // （src/hooks/usePopupActions.ts の isPasswordProtected）
  if (withPassword) {
    defaultSettings['password'] = {
      enabled: true,
      passwordHash: TEST_DATA.password.validHash
    };
  }

  // ブロックリストは settings.blockList に保持される（トップレベルの
  // blockList キーではない）
  if (withBlockList) {
    defaultSettings['blockList'] = [
      {
        id: '1',
        domain: 'example.com',
        isWildcard: false,
        createdAt: new Date().toISOString(),
        enabled: true
      }
    ];
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

  // Premium 設定
  // 実装は ExtensionPay で判定するが、premiumCache が有効期間内なら
  // それを優先して読む（src/lib/license.ts）。テストからはこのキャッシュを
  // 書くことで Premium 状態を再現する
  if (withPremium) {
    await setStorageData(page, 'premiumCache', {
      status: { isPremium: true, source: 'extpay' },
      timestamp: Date.now()
    });
  }
}
