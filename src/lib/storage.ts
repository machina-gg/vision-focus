import { Storage } from '@plasmohq/storage';

import {
  DEFAULT_ANALYTICS,
  DEFAULT_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY,
  DEFAULT_VISION,
  type AnalyticsData,
  type AppSettings,
  type StorageSchema,
  type UnblockHistory,
  type VisionSettings
} from '~/types/storage';

// Create storage instance
const storage = new Storage({
  area: 'local'
});

// Storage keys
const KEYS = {
  settings: 'settings',
  vision: 'vision',
  analytics: 'analytics',
  unblockHistory: 'unblockHistory'
} as const;

// Get settings
export async function getSettings(): Promise<AppSettings> {
  const data = await storage.get<AppSettings>(KEYS.settings);
  return data ?? DEFAULT_SETTINGS;
}

// Set settings
export async function setSettings(settings: AppSettings): Promise<void> {
  await storage.set(KEYS.settings, settings);
}

// Update settings partially
export async function updateSettings(
  update: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...update };
  await setSettings(updated);
  return updated;
}

// Get vision settings
export async function getVision(): Promise<VisionSettings> {
  const data = await storage.get<VisionSettings>(KEYS.vision);
  return data ?? DEFAULT_VISION;
}

// Set vision settings
export async function setVision(vision: VisionSettings): Promise<void> {
  await storage.set(KEYS.vision, vision);
}

// Get analytics data
export async function getAnalytics(): Promise<AnalyticsData> {
  const data = await storage.get<AnalyticsData>(KEYS.analytics);
  return data ?? DEFAULT_ANALYTICS;
}

// Set analytics data
export async function setAnalytics(analytics: AnalyticsData): Promise<void> {
  await storage.set(KEYS.analytics, analytics);
}

// Get unblock history
export async function getUnblockHistory(): Promise<UnblockHistory> {
  const data = await storage.get<UnblockHistory>(KEYS.unblockHistory);
  return data ?? DEFAULT_UNBLOCK_HISTORY;
}

// Set unblock history
export async function setUnblockHistory(
  history: UnblockHistory
): Promise<void> {
  await storage.set(KEYS.unblockHistory, history);
}

// Get all storage data
export async function getAllStorage(): Promise<StorageSchema> {
  const [settings, vision, analytics, unblockHistory] = await Promise.all([
    getSettings(),
    getVision(),
    getAnalytics(),
    getUnblockHistory()
  ]);

  return { settings, vision, analytics, unblockHistory };
}

// Clear all storage (for debugging)
export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    storage.remove(KEYS.settings),
    storage.remove(KEYS.vision),
    storage.remove(KEYS.analytics),
    storage.remove(KEYS.unblockHistory)
  ]);
}

// Increment site block count
export async function incrementSiteBlockCount(domain: string): Promise<void> {
  const analytics = await getAnalytics();
  const now = new Date().toISOString();

  const existing = analytics.siteBlockCounts?.[domain];
  const updated: AnalyticsData = {
    ...analytics,
    siteBlockCounts: {
      ...analytics.siteBlockCounts,
      [domain]: {
        domain,
        count: (existing?.count ?? 0) + 1,
        lastBlocked: now
      }
    }
  };

  await setAnalytics(updated);
}

// Get site block count
export async function getSiteBlockCount(domain: string): Promise<number> {
  const analytics = await getAnalytics();
  return analytics.siteBlockCounts?.[domain]?.count ?? 0;
}

// Get all site block counts sorted by count (descending)
export async function getAllSiteBlockCounts(): Promise<
  Array<{ domain: string; count: number; lastBlocked: string }>
> {
  const analytics = await getAnalytics();
  const counts = Object.values(analytics.siteBlockCounts ?? {});
  return counts.sort((a, b) => b.count - a.count);
}

// Session storage for last blocked domain (for newtab display)
const SESSION_KEYS = {
  lastBlockedDomain: 'lastBlockedDomain'
} as const;

export async function setLastBlockedDomain(domain: string): Promise<void> {
  await chrome.storage.session.set({
    [SESSION_KEYS.lastBlockedDomain]: domain
  });
}

export async function getLastBlockedDomain(): Promise<string | null> {
  const result = await chrome.storage.session.get(
    SESSION_KEYS.lastBlockedDomain
  );
  return result[SESSION_KEYS.lastBlockedDomain] ?? null;
}

export async function clearLastBlockedDomain(): Promise<void> {
  await chrome.storage.session.remove(SESSION_KEYS.lastBlockedDomain);
}

// Get site wasted time in seconds
export async function getSiteWastedTime(domain: string): Promise<number> {
  const analytics = await getAnalytics();
  const siteTime = analytics.siteTime?.[domain];

  // 浪費カテゴリまたは未分類のサイトの時間を返す
  if (
    siteTime &&
    (siteTime.category === 'waste' || siteTime.category === 'neutral')
  ) {
    return siteTime.time;
  }

  return 0;
}

// Export storage instance for direct use with hooks
export { storage };
