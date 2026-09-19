import { storage as extensionStorage } from '@wxt-dev/storage';

import { isStoredObject, objectOrFallback } from './storedValue';

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

/**
 * local 領域に置くキー。
 *
 * `local:` は @wxt-dev/storage が保存領域を選ぶための接頭辞であり、
 * chrome.storage.local 上の実キーは接頭辞を除いた `settings` などになる。
 * 値は生のオブジェクトのまま保存される（JSON 文字列ではない）。
 */
type LocalStorageKey =
  'settings' | 'vision' | 'analytics' | 'unblockHistory' | 'supportPrompt';

/**
 * ストレージ項目の定義。
 *
 * `fallback` は値が未保存のときに `getValue()` / `watch()` が返す既定値で、
 * 呼び出し側でのデフォルト補完は不要になる。
 * `watch` を張る側（background / content script）はこの項目を直接使う。
 */
export const settingsItem = extensionStorage.defineItem<AppSettings>(
  'local:settings',
  { fallback: DEFAULT_SETTINGS }
);

export const visionItem = extensionStorage.defineItem<VisionSettings>(
  'local:vision',
  { fallback: DEFAULT_VISION }
);

export const analyticsItem = extensionStorage.defineItem<AnalyticsData>(
  'local:analytics',
  { fallback: DEFAULT_ANALYTICS }
);

export const unblockHistoryItem = extensionStorage.defineItem<UnblockHistory>(
  'local:unblockHistory',
  { fallback: DEFAULT_UNBLOCK_HISTORY }
);

/**
 * キー指定で local 領域を読み書きする互換オブジェクト。
 *
 * 項目定義（上記の `*Item`）を使わない既存の呼び出し側（src/hooks 配下など）を
 * 残したまま保存ライブラリを入れ替えるための層。呼び出し側の移行は別 PR で行う
 * （machina-gg/vision-focus#399）。
 */
export const storage = {
  /**
   * 未保存なら undefined を返す（`!== undefined` で判定する呼び出し側があるため null にしない）。
   * 旧形式（文字列）が残っていた場合も未保存として扱い、呼び出し側の既定値に任せる
   */
  async get<T>(key: LocalStorageKey): Promise<T | undefined> {
    const value = await extensionStorage.getItem<T>(`local:${key}`);
    return isStoredObject(value) ? value : undefined;
  },
  async set<T>(key: LocalStorageKey, value: T): Promise<void> {
    await extensionStorage.setItem<T>(`local:${key}`, value);
  },
  async remove(key: LocalStorageKey): Promise<void> {
    await extensionStorage.removeItem(`local:${key}`);
  }
};

// Get settings
export async function getSettings(): Promise<AppSettings> {
  return objectOrFallback(await settingsItem.getValue(), DEFAULT_SETTINGS);
}

// Set settings
export async function setSettings(settings: AppSettings): Promise<void> {
  await settingsItem.setValue(settings);
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
  return objectOrFallback(await visionItem.getValue(), DEFAULT_VISION);
}

// Set vision settings
export async function setVision(vision: VisionSettings): Promise<void> {
  await visionItem.setValue(vision);
}

// Get analytics data
export async function getAnalytics(): Promise<AnalyticsData> {
  return objectOrFallback(await analyticsItem.getValue(), DEFAULT_ANALYTICS);
}

// Set analytics data
export async function setAnalytics(analytics: AnalyticsData): Promise<void> {
  await analyticsItem.setValue(analytics);
}

// Get unblock history
export async function getUnblockHistory(): Promise<UnblockHistory> {
  return objectOrFallback(
    await unblockHistoryItem.getValue(),
    DEFAULT_UNBLOCK_HISTORY
  );
}

// Set unblock history
export async function setUnblockHistory(
  history: UnblockHistory
): Promise<void> {
  await unblockHistoryItem.setValue(history);
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
    settingsItem.removeValue(),
    visionItem.removeValue(),
    analyticsItem.removeValue(),
    unblockHistoryItem.removeValue()
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
