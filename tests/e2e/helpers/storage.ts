import type { Page, BrowserContext } from '@playwright/test';
import { TEST_DATA } from './constants';

import type { LastBlocked } from '~/lib/storage';
import { toDateKey } from '~/lib/time';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type {
  AllowRule,
  BlockRule,
  SiteEntry,
  SiteKey,
  SiteRule,
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

export type LocalStorageKey = keyof StorageSchema;

export interface SessionStorageSchema {
  lastBlocked: LastBlocked;
}

export async function setStorageData<K extends LocalStorageKey>(
  page: Page,
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  // @wxt-dev/storage と同じく生のオブジェクトで保存する（JSON 文字列だとアプリのスキーマ検証に落ちる）
  await page.evaluate(
    async ({ key, value }) => {
      await chrome.storage.local.set({ [key]: value });
    },
    { key, value }
  );
}

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

export async function getStorageData<K extends LocalStorageKey>(
  page: Page,
  key: K
): Promise<StorageSchema[K] | null> {
  return page.evaluate(async (key) => {
    const result = await chrome.storage.local.get(key);
    return (result[key] ?? null) as StorageSchema[K] | null;
  }, key);
}

export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await chrome.storage.local.clear();
  });
}

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
    fontSettings: { family: 'system', size: 'lg', weight: 'bold' },
    ...overrides
  };
}

export function makePreset(
  id: string,
  name: string,
  overrides: Partial<DashboardDisplaySettings> & {
    customBackgroundId?: string | null;
  } = {}
): DashboardPreset {
  const { customBackgroundId = null, ...display } = overrides;
  return {
    ...makeDisplaySettings(display),
    id,
    name,
    createdAt: new Date().toISOString(),
    customBackgroundId
  };
}

// 画像は項目定義を通さない動的なキー（backgroundImage:<ID>）に置かれる
const BACKGROUND_IMAGE_KEY_PREFIX = 'backgroundImage:';

/** 2x2 の JPEG の base64（アップロードと前提データに使う。アプリの画像の検査を通る形） */
export const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDg6KKK+xPnD//Z';

export const TINY_JPEG_DATA_URL = `data:image/jpeg;base64,${TINY_JPEG_BASE64}`;

export async function setBackgroundImage(
  page: Page,
  imageId: string,
  dataUrl: string
): Promise<void> {
  await page.evaluate(
    async ({ key, dataUrl }) => {
      await chrome.storage.local.set({ [key]: dataUrl });
    },
    { key: `${BACKGROUND_IMAGE_KEY_PREFIX}${imageId}`, dataUrl }
  );
}

/** 保存されている画像の ID の一覧 */
export async function getBackgroundImageIds(page: Page): Promise<string[]> {
  const keys = await page.evaluate(async () =>
    Object.keys(await chrome.storage.local.get(null))
  );
  return keys
    .filter((key) => key.startsWith(BACKGROUND_IMAGE_KEY_PREFIX))
    .map((key) => key.slice(BACKGROUND_IMAGE_KEY_PREFIX.length))
    .sort();
}

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

export async function setSettings(
  page: Page,
  overrides: Partial<AppSettings> = {}
): Promise<void> {
  await setStorageData(page, 'settings', makeAppSettings(overrides));
}

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

export function makeAppSettings(
  overrides: Partial<AppSettings> = {}
): AppSettings {
  return {
    schedules: [],
    notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 },
    password: { enabled: false, passwordHash: null },
    unblockConfirm: { holdSeconds: 5 },
    analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
    ...overrides
  };
}

export interface SiteSeed {
  domain: SiteKey;
  block?: Partial<Omit<BlockRule, 'kind'>> | null;
  allow?: Partial<Omit<AllowRule, 'kind'>> | null;
  youtube?: Partial<YouTubeFeatures> | null;
  trackedAt?: string;
}

function seedRule(
  { block, allow }: Pick<SiteSeed, 'block' | 'allow'>,
  now: string
): SiteRule | null {
  if (allow) return { kind: 'allow', recordTime: false, ...allow };
  if (block) {
    return {
      kind: 'block',
      enabled: true,
      addedAt: now,
      timeLimit: null,
      ...block
    };
  }
  return null;
}

export function makeSites(seeds: SiteSeed[]): TrackedSites {
  const now = new Date().toISOString();
  return Object.fromEntries(
    seeds.map(({ domain, block, allow, youtube, trackedAt = now }) => [
      domain,
      {
        domain,
        trackedAt,
        rule: seedRule({ block, allow }, now),
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

export async function setSites(page: Page, seeds: SiteSeed[]): Promise<void> {
  await setStorageData(page, 'sites', makeSites(seeds));
}

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

export const SITE_ROW_MISSING = 'missing';

export async function readSiteSetting(
  page: Page,
  domain: SiteKey,
  field: 'rule' | 'youtube'
): Promise<SiteEntry['rule'] | SiteEntry['youtube'] | typeof SITE_ROW_MISSING> {
  const sites = await getStorageData(page, 'sites');
  const row = sites?.[domain];
  return row === undefined ? SITE_ROW_MISSING : row[field];
}

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

export interface TestStorageOptions {
  withGoal?: boolean;
  withBlockList?: boolean;
  withPassword?: boolean;
  withAnalyticsOptIn?: boolean;
  withSchedule?: boolean;
}

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

  if (withPassword) {
    overrides.password = {
      enabled: true,
      passwordHash: TEST_DATA.password.validHash
    };
  }

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

  if (withBlockList) {
    data.sites = makeSites([{ domain: 'example.com', block: {} }]);
  }

  if (withGoal) {
    data.vision = makeVision();
  }

  return data;
}

/** 拡張機能のページを開いて書くため、アプリの hydration に上書きされることがある（確実に置くなら setupTestStorageViaSW） */
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
