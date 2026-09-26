import type { Page, BrowserContext } from '@playwright/test';
import { TEST_DATA } from './constants';

import type {
  AnalyticsData,
  AppSettings,
  DashboardDisplaySettings,
  DashboardPreset,
  SiteBlockCount,
  StorageSchema,
  TimeLimitUsage,
  UnblockedSite,
  UnblockHistory,
  VisionSettings,
  YouTubeSettings
} from '~/types/storage';

/**
 * chrome.storage.local のテストデータ設定・取得ヘルパー
 *
 * E2Eテストで chrome.storage.local を直接操作するためのユーティリティ。
 *
 * ⚠ 値は `unknown` では受けない。キーごとに実装の型（`StorageSchema`）で受ける
 * ことで、保存形と違うキー名（`siteStats` / `unblockHistory.entries` など）を
 * 型検査で止める。テスト側に対応表を作り直すと実装のキーが変わっても気づけない
 * ため、キーの一覧は実装の `StorageSchema` をそのまま使う（#437）。
 *
 * ⚠ `supportPrompt` のように `StorageSchema` に載っていない local キーが実装に
 * ある。必要になったら実装側の `StorageSchema` に足す（ここで補わない）。
 */

/** local 領域に書けるキー（実装の `StorageSchema` が持つもの） */
export type LocalStorageKey = keyof StorageSchema;

/**
 * session 領域に置かれる値
 *
 * 実装では `src/lib/storage.ts` の `SESSION_KEYS` が持つ（型としては公開されて
 * いないため、テストから参照できる形をここに置く）。
 */
export interface SessionStorageSchema {
  /** 直近でブロックされたドメイン。newtab のブロック情報表示が読む */
  lastBlockedDomain: string;
}

/**
 * chrome.storage.local にデータをセットする
 *
 * @param page - Playwright Page オブジェクト
 * @param key - ストレージキー
 * @param value - セットする値（キーに対応する実装の型）
 */
export async function setStorageData<K extends LocalStorageKey>(
  page: Page,
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  // アプリは @wxt-dev/storage 経由で読み書きしており、値は生のオブジェクトの
  // まま保存される（キーは `local:` を除いた `settings` などで、接頭辞は
  // 保存領域の指定にしか使われない）。JSON 文字列で書き込むとアプリ側の
  // スキーマ検証に落ちるため、同じ形式で保存する
  await page.evaluate(
    async ({ key, value }) => {
      await chrome.storage.local.set({ [key]: value });
    },
    { key, value }
  );
}

/**
 * chrome.storage.session にデータをセットする
 *
 * lastBlockedDomain のように session エリアに保存される値は、local に書いても
 * アプリから読めない（src/lib/storage.ts の SESSION_KEYS）。
 * session は chrome.storage.session を直接使う。
 *
 * @param page - Playwright Page オブジェクト（拡張機能コンテキストのページ）
 * @param key - ストレージキー
 * @param value - セットする値
 */
export async function setSessionStorageData<
  K extends keyof SessionStorageSchema
>(page: Page, key: K, value: SessionStorageSchema[K]): Promise<void> {
  await page.evaluate(
    async ({ key, value }) => {
      await chrome.storage.session.set({ [key]: value });
    },
    { key, value }
  );
}

/**
 * chrome.storage.session からデータを取得する
 *
 * lastBlockedDomain のように、拡張機能が session 領域に置く値は
 * local を読んでも取れない。
 */
export async function getSessionStorageData<
  K extends keyof SessionStorageSchema
>(page: Page, key: K): Promise<SessionStorageSchema[K] | null> {
  return await page.evaluate(async (key) => {
    const result = await chrome.storage.session.get(key);
    return (result[key] ?? null) as SessionStorageSchema[K] | null;
  }, key);
}

/**
 * chrome.storage.local からデータを取得する
 *
 * @param page - Playwright Page オブジェクト
 * @param key - ストレージキー
 * @returns 取得した値（未保存なら null）
 */
export async function getStorageData<K extends LocalStorageKey>(
  page: Page,
  key: K
): Promise<StorageSchema[K] | null> {
  return page.evaluate(async (key) => {
    const result = await chrome.storage.local.get(key);
    // @wxt-dev/storage は値を生のまま保存するので、読み出しも変換しない
    return (result[key] ?? null) as StorageSchema[K] | null;
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
 * @param value - セットする値（キーに対応する実装の型）
 */
export async function setStorageDataFromExtension<K extends LocalStorageKey>(
  context: BrowserContext,
  extensionId: string,
  key: K,
  value: StorageSchema[K]
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
 * @returns 取得した値（未保存なら null）
 */
export async function getStorageDataFromExtension<K extends LocalStorageKey>(
  context: BrowserContext,
  extensionId: string,
  key: K
): Promise<StorageSchema[K] | null> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');
  const result = await getStorageData(page, key);
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
  overrides: Partial<DashboardDisplaySettings> = {}
): DashboardDisplaySettings {
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
  overrides: Partial<DashboardDisplaySettings> = {}
): DashboardPreset {
  return {
    ...makeDisplaySettings(overrides),
    id,
    name,
    createdAt: new Date().toISOString()
  };
}

/**
 * VisionSettings の完全な形を作る
 *
 * 既定の表示設定と同じ内容を持つプリセット 1 件を用意し、それを有効にする。
 *
 * @param overrides - 上書きする値
 */
export function makeVision(
  overrides: Partial<VisionSettings> = {}
): VisionSettings {
  return {
    defaultSettings: makeDisplaySettings(),
    presets: [makePreset('default', 'Default')],
    activePresetId: 'default',
    ...overrides
  };
}

/**
 * settings を「欠けたフィールドのない完全な形」で書き込む
 *
 * 部分的な settings を直接書くと、実装側が `settings.schedules` などを
 * 前提にしている箇所で処理が止まる。ブロックルールの再計算が丸ごと
 * 失敗しても E2E からは「なぜかブロックされない」としか見えないため、
 * settings の書き込みは必ずこのヘルパー経由にする。
 */
export async function setSettings(
  page: Page,
  overrides: Partial<AppSettings> = {}
): Promise<void> {
  await setStorageData(page, 'settings', makeSettings(overrides));
}

/** 拡張機能のページを開いて settings を書き込む（完全な形で書く） */
export async function setSettingsFromExtension(
  context: BrowserContext,
  extensionId: string,
  overrides: Partial<AppSettings> = {}
): Promise<void> {
  await setStorageDataFromExtension(
    context,
    extensionId,
    'settings',
    makeSettings(overrides)
  );
}

/**
 * YouTube 設定を「欠けたフィールドのない完全な形」で作る
 *
 * 実装は保存された youtube 設定をスキーマ検証しており、フィールドが欠けていると
 * 検証に失敗して既定値（enabled: false）にフォールバックする。その結果
 * コンテンツスクリプトが CSS を一切注入せず、テストからは「設定したのに
 * 効かない」としか見えない。
 */
export function makeYouTubeSettings(
  overrides: Partial<YouTubeSettings> = {}
): YouTubeSettings {
  return {
    enabled: true,
    blockAccess: false,
    hideShorts: false,
    hideRecommendations: false,
    hideComments: false,
    hideHomeFeed: false,
    timeLimit: null,
    ...overrides
  };
}

/**
 * Time Limit の使用実績を作る
 *
 * 実装は `analytics.timeLimitUsage[domain]` に
 * `{ domain, dailyUsedSeconds, lastDailyReset }`
 * の形で持つ。トップレベルの `timeLimitUsage` キーや
 * `{ daily: { used, resetAt } }` という形は実装に存在しない。
 */
export function makeTimeLimitUsage(
  domain: string,
  used: { daily?: number } = {},
  now: Date = new Date()
): Record<string, TimeLimitUsage> {
  const todayKey = now.toISOString().slice(0, 10);

  return {
    [domain]: {
      domain,
      dailyUsedSeconds: used.daily ?? 0,
      lastDailyReset: todayKey
    }
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
  overrides: Partial<AppSettings> = {}
): AppSettings {
  return {
    blockList: [],
    schedules: [],
    paused: false,
    notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 },
    // YouTube 設定の既定値はここで組み立て直さない。書き漏らすとスキーマ検証に
    // 落ちて無言で既定値になるため、完全な形を作る 1 箇所に寄せる
    youtube: makeYouTubeSettings({ enabled: false }),
    password: { enabled: false, passwordHash: null },
    unblockConfirm: { holdSeconds: 5 },
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
  overrides: Partial<AnalyticsData> = {}
): AnalyticsData {
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
): Record<string, SiteBlockCount> {
  const now = new Date().toISOString();
  return Object.fromEntries(
    entries.map(([domain, count]) => [
      domain,
      { domain, count, lastBlocked: now }
    ])
  );
}

/**
 * 解除済みサイトの履歴を作る
 *
 * `tracker-heartbeat` は「解除履歴に `status: 'unblocked'` で載っている
 * ドメイン」だけを計測する（該当しなければ `recordTime` が途中で return する）。
 * 解除後の時間の記録を検証するテストは、対象ドメインをここで先に履歴へ入れておく。
 *
 * @param domains - 解除済みとして扱うドメイン
 * @param overrides - 各サイトに与える上書き（滞在時間の初期値など）
 */
export function makeUnblockHistory(
  domains: string[],
  overrides: Partial<UnblockedSite> = {}
): UnblockHistory {
  const now = new Date().toISOString();

  // タプルの型を明示する。推論に任せると値の型が union に広がり、
  // UnblockedSite との不一致を型検査が見逃す
  const entries: [string, UnblockedSite][] = domains.map((domain) => [
    domain,
    {
      domain,
      status: 'unblocked',
      blockedAt: now,
      unblockedAt: now,
      timeAfterUnblock: 0,
      lastActivity: null,
      ...overrides
    }
  ]);

  return { sites: Object.fromEntries(entries) };
}

/**
 * テスト用の初期設定をセットする
 *
 * @param page - Playwright Page オブジェクト
 * @param options - テストオプション
 */
export interface TestStorageOptions {
  withGoal?: boolean;
  withBlockList?: boolean;
  withPassword?: boolean;
  withAnalyticsOptIn?: boolean;
  withSchedule?: boolean;
}

/**
 * テスト用の storage データを組み立てる（書き込みは行わない）
 *
 * AppSettings の必須フィールドを欠くと、実装側で settings.blockList.length の
 * ような参照が例外になる（アプリはストレージに保存済みの値をそのまま使う）。
 * 必須フィールドの充足は `makeSettings` に任せ、ここでは差分だけを与える。
 */
export function makeTestStorage(
  options: TestStorageOptions = {}
): Pick<StorageSchema, 'settings'> & Partial<StorageSchema> {
  const {
    withGoal = true,
    withBlockList = false,
    withPassword = false,
    withAnalyticsOptIn = true,
    withSchedule = false
  } = options;

  const overrides: Partial<AppSettings> = {
    analyticsOptIn: withAnalyticsOptIn
      ? { enabled: true, decidedAt: new Date().toISOString() }
      : null
  };

  // パスワード保護は enabled と passwordHash の両方が必要
  // （src/hooks/usePopupActions.ts の isPasswordProtected）
  if (withPassword) {
    overrides.password = {
      enabled: true,
      passwordHash: TEST_DATA.password.validHash
    };
  }

  // 週間カレンダーはスケジュールが 1 件以上ないと描画されない
  // （WeeklyCalendar は schedules.length === 0 で null を返す）
  if (withSchedule) {
    overrides.schedules = [
      {
        id: 'schedule-1',
        name: 'Work Hours',
        startTime: '09:00',
        endTime: '18:00',
        days: [1, 2, 3, 4, 5],
        enabled: true
      }
    ];
  }

  // ブロックリストは settings.blockList に保持される
  // （トップレベルの blockList キーではない）
  if (withBlockList) {
    overrides.blockList = [
      {
        id: '1',
        domain: 'example.com',
        isWildcard: false,
        createdAt: new Date().toISOString(),
        enabled: true
      }
    ];
  }

  const data: Pick<StorageSchema, 'settings'> & Partial<StorageSchema> = {
    settings: makeSettings(overrides)
  };

  // Vision 設定（目標テキスト）。
  // DashboardDisplaySettings / DashboardPreset の全フィールドを満たすこと。
  // 特にサブテキストのキーは goalSubText（subText ではない）
  if (withGoal) {
    data.vision = makeVision();
  }

  return data;
}

/**
 * テスト用の storage データをページ経由で書き込む
 *
 * 注意: 拡張機能のページを開いた状態で書くため、アプリの hydration が
 * state を書き戻して上書きすることがある。言語設定のように「アプリが
 * 読み込んで描画に使う」値を確実に置きたい場合は、SW 経由の
 * `setupTestStorageViaSW` を使う。
 */
export async function setupTestStorage(
  page: Page,
  options: TestStorageOptions = {}
): Promise<void> {
  const data = makeTestStorage(options);

  await setStorageData(page, 'settings', data.settings);
  if (data.vision) {
    await setStorageData(page, 'vision', data.vision);
  }
}
