import { storage as extensionStorage } from '@wxt-dev/storage';

import { isStoredObject, objectOrFallback } from './storedValue';

import {
  DEFAULT_ACTIVITY,
  DEFAULT_SETTINGS,
  DEFAULT_SUPPORT_PROMPT_STATE,
  DEFAULT_UNBLOCK_HISTORY,
  DEFAULT_VISION,
  type AppSettings,
  type StorageSchema,
  type SupportPromptState,
  type UnblockHistory,
  type VisionSettings
} from '~/types/storage';
import type { ActivityLog } from '~/types/activity';

/**
 * ストレージ項目の定義。local 領域のキーはこの一覧だけが持つ。
 *
 * `local:` は @wxt-dev/storage が保存領域を選ぶための接頭辞であり、
 * chrome.storage.local 上の実キーは接頭辞を除いた `settings` などになる。
 * 値は生のオブジェクトのまま保存される（JSON 文字列ではない）。
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

export const unblockHistoryItem = extensionStorage.defineItem<UnblockHistory>(
  'local:unblockHistory',
  { fallback: DEFAULT_UNBLOCK_HISTORY }
);

/**
 * 日 × サイトの事実。書くのは `src/lib/activityService.ts` だけ
 * （読む → 足す → 書くを 1 本の待ち行列で直列化しているため、他から書くと加算が消える）
 */
export const activityItem = extensionStorage.defineItem<ActivityLog>(
  'local:activity',
  { fallback: DEFAULT_ACTIVITY }
);

export const supportPromptItem =
  extensionStorage.defineItem<SupportPromptState>('local:supportPrompt', {
    fallback: DEFAULT_SUPPORT_PROMPT_STATE
  });

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

/**
 * vision が保存済みかどうか。
 *
 * 項目定義の `getValue()` は未保存でも `fallback` を返すため、
 * 「未保存」と「既定値が保存されている」を区別したい呼び出し側はこちらを使う
 * （旧形式で残った値も未保存として扱う）。
 */
export async function hasStoredVision(): Promise<boolean> {
  return isStoredObject(
    await extensionStorage.getItem<VisionSettings>(visionItem.key)
  );
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
  const [settings, vision, unblockHistory, activity] = await Promise.all([
    getSettings(),
    getVision(),
    getUnblockHistory(),
    activityItem.getValue()
  ]);

  return {
    settings,
    vision,
    unblockHistory,
    activity: objectOrFallback(activity, DEFAULT_ACTIVITY)
  };
}

// Clear all storage (for debugging)
export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    settingsItem.removeValue(),
    visionItem.removeValue(),
    unblockHistoryItem.removeValue(),
    activityItem.removeValue()
  ]);
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
