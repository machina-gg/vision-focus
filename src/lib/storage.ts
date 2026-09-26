import { storage as extensionStorage } from '@wxt-dev/storage';

import { isStoredObject, objectOrFallback } from './storedValue';

import {
  DEFAULT_ACTIVITY,
  DEFAULT_SETTINGS,
  DEFAULT_SITES,
  DEFAULT_SUPPORT_PROMPT_STATE,
  DEFAULT_VISION,
  type AppSettings,
  type StorageSchema,
  type SupportPromptState,
  type VisionSettings
} from '~/types/storage';
import type { ActivityLog } from '~/types/activity';
import type { TrackedSites } from '~/types/site';

/** `local:` は @wxt-dev/storage の領域の指定で、chrome.storage.local 上の実キーは接頭辞を除いた名前になる */
export const settingsItem = extensionStorage.defineItem<AppSettings>(
  'local:settings',
  { fallback: DEFAULT_SETTINGS }
);

export const visionItem = extensionStorage.defineItem<VisionSettings>(
  'local:vision',
  { fallback: DEFAULT_VISION }
);

/** 書くのは `siteService` だけ（待ち行列の外から書くと変更が消える） */
export const sitesItem = extensionStorage.defineItem<TrackedSites>(
  'local:sites',
  { fallback: DEFAULT_SITES }
);

/** 書くのは `activityService` だけ（待ち行列の外から書くと加算が消える） */
export const activityItem = extensionStorage.defineItem<ActivityLog>(
  'local:activity',
  { fallback: DEFAULT_ACTIVITY }
);

export const supportPromptItem =
  extensionStorage.defineItem<SupportPromptState>('local:supportPrompt', {
    fallback: DEFAULT_SUPPORT_PROMPT_STATE
  });

export async function getSettings(): Promise<AppSettings> {
  return objectOrFallback(await settingsItem.getValue(), DEFAULT_SETTINGS);
}

export async function setSettings(settings: AppSettings): Promise<void> {
  await settingsItem.setValue(settings);
}

/** 設定の一部を書き換えて保存し、保存後の設定を返す */
export async function updateSettings(
  update: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...update };
  await setSettings(updated);
  return updated;
}

export async function getVision(): Promise<VisionSettings> {
  return objectOrFallback(await visionItem.getValue(), DEFAULT_VISION);
}

export async function setVision(vision: VisionSettings): Promise<void> {
  await visionItem.setValue(vision);
}

/** `getValue()` は未保存でも fallback を返すので、未保存と既定値の保存済みを区別するときはこちらを使う */
export async function hasStoredVision(): Promise<boolean> {
  return isStoredObject(
    await extensionStorage.getItem<VisionSettings>(visionItem.key)
  );
}

export async function getSites(): Promise<TrackedSites> {
  return objectOrFallback(await sitesItem.getValue(), DEFAULT_SITES);
}

/** settings / vision / sites / activity をまとめて読む（supportPrompt は含めない） */
export async function getAllStorage(): Promise<StorageSchema> {
  const [settings, vision, sites, activity] = await Promise.all([
    getSettings(),
    getVision(),
    getSites(),
    activityItem.getValue()
  ]);

  return {
    settings,
    vision,
    sites,
    activity: objectOrFallback(activity, DEFAULT_ACTIVITY)
  };
}

/** settings / vision / sites / activity を消す（supportPrompt は残す） */
export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    settingsItem.removeValue(),
    visionItem.removeValue(),
    sitesItem.removeValue(),
    activityItem.removeValue()
  ]);
}

const SESSION_KEYS = {
  lastBlockedDomain: 'lastBlockedDomain'
} as const;

/** 最後にブロックしたドメインを session 領域に残す（ブロック画面の表示に使う） */
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
