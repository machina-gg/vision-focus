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
import type { BlockedReason } from '~/lib/blockRule';

/** アプリの設定の保存項目。`local:` は @wxt-dev/storage の領域の指定で、chrome.storage.local 上の実キーは接頭辞を除いた名前になる */
export const settingsItem = extensionStorage.defineItem<AppSettings>(
  'local:settings',
  { fallback: DEFAULT_SETTINGS }
);

/** ダッシュボードの表示設定の保存項目 */
export const visionItem = extensionStorage.defineItem<VisionSettings>(
  'local:vision',
  { fallback: DEFAULT_VISION }
);

/** 追跡中のサイトの保存項目。書くのは `siteService` だけ（待ち行列の外から書くと変更が消える） */
export const sitesItem = extensionStorage.defineItem<TrackedSites>(
  'local:sites',
  { fallback: DEFAULT_SITES }
);

/** 活動の記録の保存項目。書くのは `activityService` だけ（待ち行列の外から書くと加算が消える） */
export const activityItem = extensionStorage.defineItem<ActivityLog>(
  'local:activity',
  { fallback: DEFAULT_ACTIVITY }
);

/** 支援誘導の表示状態の保存項目 */
export const supportPromptItem =
  extensionStorage.defineItem<SupportPromptState>('local:supportPrompt', {
    fallback: DEFAULT_SUPPORT_PROMPT_STATE
  });

/**
 * アプリの設定を読む
 * @returns 保存済みの設定（未保存か壊れていれば既定値）
 */
export async function getSettings(): Promise<AppSettings> {
  return objectOrFallback(await settingsItem.getValue(), DEFAULT_SETTINGS);
}

/**
 * ダッシュボードの表示設定を読む
 * @returns 保存済みの表示設定（未保存か壊れていれば既定値）
 */
export async function getVision(): Promise<VisionSettings> {
  return objectOrFallback(await visionItem.getValue(), DEFAULT_VISION);
}

/**
 * ダッシュボードの表示設定を丸ごと保存する
 * @param vision 保存する表示設定
 */
export async function setVision(vision: VisionSettings): Promise<void> {
  await visionItem.setValue(vision);
}

/**
 * ダッシュボードの表示設定が保存済みか。`getValue()` は未保存でも fallback を返すので、未保存と既定値の保存済みを区別するときはこちらを使う
 * @returns 使える形の値が保存されていれば true
 */
export async function hasStoredVision(): Promise<boolean> {
  return isStoredObject(
    await extensionStorage.getItem<VisionSettings>(visionItem.key)
  );
}

/**
 * 追跡中のサイトを読む
 * @returns 保存済みのサイト（未保存か壊れていれば既定値）
 */
export async function getSites(): Promise<TrackedSites> {
  return objectOrFallback(await sitesItem.getValue(), DEFAULT_SITES);
}

/**
 * settings / vision / sites / activity をまとめて読む（supportPrompt は含めない）
 * @returns 保存領域の中身（未保存か壊れている項目は既定値）
 */
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

const SESSION_KEYS = {
  lastBlocked: 'lastBlocked'
} as const;

/** 最後にブロックしたドメインと、そのときのブロックの理由（ブロック画面の帯に出す） */
export interface LastBlocked {
  /** ブロックしたホスト名 */
  domain: string;
  /** ブロックの理由 */
  reason: BlockedReason;
}

/**
 * 最後にブロックしたドメインと理由を session 領域に残す（ブロック画面の表示に使う）
 * @param record ブロックしたホスト名と理由
 */
export async function setLastBlocked(record: LastBlocked): Promise<void> {
  await chrome.storage.session.set({
    [SESSION_KEYS.lastBlocked]: record
  });
}

/**
 * 最後にブロックしたドメインと理由を session 領域から読む
 * @returns ブロックしたホスト名と理由（残っていなければ null）
 */
export async function getLastBlocked(): Promise<LastBlocked | null> {
  const result = await chrome.storage.session.get(SESSION_KEYS.lastBlocked);
  return (result[SESSION_KEYS.lastBlocked] as LastBlocked | undefined) ?? null;
}

/** 最後にブロックしたドメインと理由を session 領域から消す */
export async function clearLastBlocked(): Promise<void> {
  await chrome.storage.session.remove(SESSION_KEYS.lastBlocked);
}
