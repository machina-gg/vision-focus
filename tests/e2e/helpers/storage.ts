import type { Page, BrowserContext } from '@playwright/test';
import { TEST_DATA } from './constants';

import { toDateKey } from '~/lib/time';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type {
  BlockRule,
  SiteKey,
  TrackedSite,
  TrackedSites,
  YouTubeFeatures
} from '~/types/site';

import type {
  AppSettings,
  DashboardDisplaySettings,
  DashboardPreset,
  StorageSchema,
  VisionSettings
} from '~/types/storage';

/**
 * chrome.storage.local のテストデータ設定・取得ヘルパー
 *
 * E2Eテストで chrome.storage.local を直接操作するためのユーティリティ。
 *
 * ⚠ 値は `unknown` では受けない。キーごとに実装の型（`StorageSchema`）で受ける
 * ことで、保存形と違うキー名（`siteStats` など）を
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
  await setStorageData(page, 'settings', makeAppSettings(overrides));
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
    makeAppSettings(overrides)
  );
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
export function makeAppSettings(
  overrides: Partial<AppSettings> = {}
): AppSettings {
  return {
    schedules: [],
    paused: false,
    notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 },
    password: { enabled: false, passwordHash: null },
    unblockConfirm: { holdSeconds: 5 },
    analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
    ...overrides
  };
}

/** 追跡中のサイト 1 件の種。省略した設定は「無い」（null）として作る */
export interface SiteSeed {
  domain: SiteKey;
  /** ブロック設定。`{}` なら有効な常時ブロック。省略・null ならブロックしない（追跡だけ） */
  block?: Partial<BlockRule> | null;
  /** YouTube 機能（youtube.com のときだけ）。`{}` ならすべて OFF で有効。省略・null なら使わない */
  youtube?: Partial<YouTubeFeatures> | null;
  trackedAt?: string;
}

/**
 * 追跡中のサイト（`sites`）を「欠けたフィールドのない完全な形」で作る
 *
 * 実装は保存された値をスキーマ検証する箇所があり（YouTube のコンテンツスクリプト）、
 * フィールドが欠けると機能を使わない扱いになる。その結果テストからは
 * 「設定したのに効かない」としか見えないため、sites は必ずこれで作る。
 * キーはサイトキー（小文字・`*.` / `www.` なし）で書く。
 *
 * @param seeds - サイトごとの種
 */
export function makeSites(seeds: SiteSeed[]): TrackedSites {
  const now = new Date().toISOString();
  return Object.fromEntries(
    seeds.map(({ domain, block, youtube, trackedAt = now }) => [
      domain,
      {
        domain,
        trackedAt,
        block: block
          ? { enabled: true, addedAt: now, timeLimit: null, ...block }
          : null,
        youtube: youtube
          ? {
              hideShorts: false,
              hideRecommendations: false,
              hideComments: false,
              hideHomeFeed: false,
              ...youtube
            }
          : null
      }
    ])
  );
}

/** 追跡中のサイトを書き込む（完全な形で書く） */
export async function setSites(page: Page, seeds: SiteSeed[]): Promise<void> {
  await setStorageData(page, 'sites', makeSites(seeds));
}

/** 拡張機能のページを開いて追跡中のサイトを書き込む（完全な形で書く） */
export async function setSitesFromExtension(
  context: BrowserContext,
  extensionId: string,
  seeds: SiteSeed[]
): Promise<void> {
  await setStorageDataFromExtension(
    context,
    extensionId,
    'sites',
    makeSites(seeds)
  );
}

/** 追跡中のサイトに行そのものが無いことを示す値 */
export const SITE_ROW_MISSING = 'missing';

/**
 * 保存済みの追跡中のサイトの 1 行から、ブロック設定か YouTube 機能を読む
 *
 * 行が無いときだけ `SITE_ROW_MISSING` を返す。`row?.[field] ?? 'missing'` の形で
 * 書くと、設定を外した行（値が null）まで「行が無い」に化け、
 * 「外しても追跡は続く（値が null の行が残る）」の検査が必ず落ちる。
 */
export async function readSiteSetting(
  page: Page,
  domain: SiteKey,
  field: 'block' | 'youtube'
): Promise<
  TrackedSite['block'] | TrackedSite['youtube'] | typeof SITE_ROW_MISSING
> {
  const sites = await getStorageData(page, 'sites');
  const row = sites?.[domain];
  return row === undefined ? SITE_ROW_MISSING : row[field];
}

/**
 * 事実の表（`activity`）を作る
 *
 * 画面の数値は追跡中のサイト（`sites`）の行だけから導出され、書き手も
 * 追跡中でないサイトの出来事を捨てる。種に置くサイトは、同じテストで `makeSites` にも入れておく。
 * 日付はローカル日付（アプリの `toDateKey` と同じ）で、既定は今日。
 *
 * @param entries - [サイトキー, 事実の一部, 何日前か（既定 0）] の配列
 * @param now - 基準の時刻（既定は現在）
 */
export function makeActivity(
  entries: [SiteKey, Partial<DailySiteActivity>, number?][],
  now: Date = new Date()
): ActivityLog {
  const log: ActivityLog = {};
  for (const [site, values, daysAgo = 0] of entries) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const key = toDateKey(date);
    log[key] = {
      ...log[key],
      [site]: { seconds: 0, blocks: 0, unblocks: 0, ...values }
    };
  }
  return log;
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
 * AppSettings の必須フィールドを欠くと、実装側で settings.schedules の
 * ような参照が例外になる（アプリはストレージに保存済みの値をそのまま使う）。
 * 必須フィールドの充足は `makeAppSettings` に任せ、ここでは差分だけを与える。
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

  const data: Pick<StorageSchema, 'settings'> & Partial<StorageSchema> = {
    settings: makeAppSettings(overrides)
  };

  // ブロックリストは追跡中のサイト（sites）のブロック設定に保持される
  if (withBlockList) {
    data.sites = makeSites([{ domain: 'example.com', block: {} }]);
  }

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
  if (data.sites) {
    await setStorageData(page, 'sites', data.sites);
  }
  if (data.vision) {
    await setStorageData(page, 'vision', data.vision);
  }
}
