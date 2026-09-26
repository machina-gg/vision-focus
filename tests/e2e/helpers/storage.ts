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

export type LocalStorageKey = keyof StorageSchema;

export interface SessionStorageSchema {
  lastBlockedDomain: string;
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
    customBackgroundData: null,
    fontSettings: { family: 'system', size: 'lg', weight: 'bold' },
    ...overrides
  };
}

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
    paused: false,
    notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 },
    password: { enabled: false, passwordHash: null },
    unblockConfirm: { holdSeconds: 5 },
    analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
    ...overrides
  };
}

export interface SiteSeed {
  domain: SiteKey;
  block?: Partial<BlockRule> | null;
  youtube?: Partial<YouTubeFeatures> | null;
  trackedAt?: string;
}

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
  field: 'block' | 'youtube'
): Promise<
  TrackedSite['block'] | TrackedSite['youtube'] | typeof SITE_ROW_MISSING
> {
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
