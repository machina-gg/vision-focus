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
 * chrome.storage.session にデータをセットする
 *
 * lastBlockedDomain のように session エリアに保存される値は、local に書いても
 * アプリから読めない（src/lib/storage.ts の SESSION_KEYS）。
 * session は @plasmohq/storage を経由せず素の値を保存するため、
 * JSON 文字列化はしない。
 *
 * @param page - Playwright Page オブジェクト（拡張機能コンテキストのページ）
 * @param key - ストレージキー
 * @param value - セットする値
 */
export async function setSessionStorageData(
  page: Page,
  key: string,
  value: unknown
): Promise<void> {
  await page.evaluate(
    async ({ key, value }) => {
      await chrome.storage.session.set({ [key]: value });
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
 * DashboardDisplaySettings の完全な形を作る
 *
 * 必須フィールドを欠くとアプリ側の参照が壊れるため、テストで vision を
 * 直接組み立てる場合は必ずこれを使う。
 *
 * @param overrides - 上書きする値
 */
export function makeDisplaySettings(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    goalText: 'Focus on what matters',
    goalSubText: 'Stay productive',
    textColor: '#ffffff',
    backgroundType: 'color',
    backgroundImage: 'default-1',
    backgroundColor: '#1a1a2e',
    customBackgroundData: null,
    fontSettings: { family: 'system', size: 'lg', weight: 'bold' },
    ...overrides
  };
}

/**
 * DashboardPreset の完全な形を作る
 *
 * @param id - プリセットID
 * @param name - プリセット名
 * @param overrides - 表示設定の上書き
 */
export function makePreset(
  id: string,
  name: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...makeDisplaySettings(overrides),
    id,
    name,
    createdAt: new Date().toISOString()
  };
}

/**
 * AppSettings の完全な形を作る
 *
 * 必須フィールドを欠くとアプリ側の参照が壊れる。また analyticsOptIn を
 * 落とすと Opt-In モーダルが開いてしまい、他の要素のクリックを遮る。
 * テストで settings を直接書く場合は必ずこれを使う。
 *
 * @param overrides - 上書きする値
 */
export function makeSettings(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    blockList: [],
    schedules: [],
    language: 'en',
    paused: false,
    notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 },
    youtube: {
      enabled: false,
      blockAccess: false,
      hideShorts: false,
      hideRecommendations: false,
      hideComments: false,
      timeLimit: null
    },
    password: { enabled: false, passwordHash: null },
    analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
    ...overrides
  };
}

/**
 * AnalyticsData の完全な形を作る
 *
 * 保存キーは 'analytics'（'analyticsData' ではない）。また各集計は
 * ドメインをキーとするレコードで、配列ではない。
 *
 * @param overrides - 上書きする値
 */
export function makeAnalytics(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    dailyStats: {},
    siteTime: {},
    siteCategories: {},
    siteBlockCounts: {},
    siteUnblockCounts: {},
    timeLimitUsage: {},
    ...overrides
  };
}

/**
 * サイト別ブロック回数のレコードを作る
 *
 * @param entries - [ドメイン, 回数] の配列
 */
export function makeSiteBlockCounts(
  entries: [string, number][]
): Record<string, { domain: string; count: number; lastBlocked: string }> {
  const now = new Date().toISOString();
  return Object.fromEntries(
    entries.map(([domain, count]) => [
      domain,
      { domain, count, lastBlocked: now }
    ])
  );
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
    withAnalyticsOptIn?: boolean;
    withSchedule?: boolean;
    language?: 'en' | 'ja';
  } = {}
): Promise<void> {
  const {
    withGoal = true,
    withBlockList = false,
    withPassword = false,
    withAnalyticsOptIn = true,
    withSchedule = false,
    language = 'en'
  } = options;

  // デフォルト設定。
  // AppSettings の必須フィールドを欠くと、実装側で settings.blockList.length の
  // ような参照が例外になる（アプリはストレージに保存済みの値をそのまま使う）。
  // 実装のスキーマと同じ形を必ず満たすこと
  const defaultSettings = {
    blockList: [],
    schedules: [],
    language,
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

  // 週間カレンダーはスケジュールが 1 件以上ないと描画されない
  // （WeeklyCalendar は schedules.length === 0 で null を返す）
  if (withSchedule) {
    defaultSettings['schedules'] = [
      {
        id: 'schedule-1',
        name: 'Work Hours',
        startTime: '09:00',
        endTime: '18:00',
        days: [1, 2, 3, 4, 5],
        enabled: true,
        presetId: null
      }
    ];
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

  // Vision 設定（目標テキスト）。
  // DashboardDisplaySettings / DashboardPreset の全フィールドを満たすこと。
  // 特にサブテキストのキーは goalSubText（subText ではない）
  if (withGoal) {
    const displaySettings = {
      goalText: 'Focus on what matters',
      goalSubText: 'Stay productive',
      textColor: '#ffffff',
      backgroundType: 'color' as const,
      backgroundImage: 'default-1',
      backgroundColor: '#1a1a2e',
      customBackgroundData: null,
      fontSettings: { family: 'system', size: 'lg', weight: 'bold' }
    };
    const defaultVision = {
      defaultSettings: displaySettings,
      presets: [
        {
          ...displaySettings,
          id: 'default',
          name: 'Default',
          createdAt: new Date().toISOString()
        }
      ],
      activePresetId: 'default'
    };
    await setStorageData(page, 'vision', defaultVision);
  }
}
