export { type TimeLimit, type AnalyticsOptIn } from './analytics';

export {
  type DashboardDisplaySettings,
  type DashboardPreset,
  type VisionSettings,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_VISION
} from './vision';

import type { VisionSettings } from './vision';
import type { ActivityLog } from './activity';
import type { TrackedSites } from './site';

/** ブロックが効く時間帯。有効なスケジュールがあるときは、どれかの時間内だけブロックする */
export interface Schedule {
  id: string;
  name: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm。24:00 = その日の終わり */
  endTime: string;
  /** 曜日（0 = 日曜 … 6 = 土曜） */
  days: number[];
  enabled: boolean;
  /** 時間内にダッシュボードへ出すスタイルの ID。無ければ適用中のスタイル */
  presetId?: string;
}

export type SupportedLanguage = 'en' | 'ja';

export type NotificationMinutes = 1 | 3 | 5 | 10;

/** 時間制限の残り時間が少なくなったときの通知 */
export interface NotificationSettings {
  timeLimitEnabled: boolean;
  /** 残り時間がこの分数以下になったら通知する */
  timeLimitMinutes: NotificationMinutes;
}

/** ブロックを弱める操作をパスワードで保護する設定 */
export interface PasswordSettings {
  enabled: boolean;
  /** 未設定なら null */
  passwordHash: string | null;
}

/** ブロック解除の長押し確認で押し続ける秒数 */
export type UnblockHoldSeconds = 5 | 10 | 30 | 60;

/** 長押し秒数の選択肢（設定画面の一覧と、取り込み時の検証に使う） */
export const UNBLOCK_HOLD_SECONDS_OPTIONS: readonly UnblockHoldSeconds[] = [
  5, 10, 30, 60
];

/** パスワード保護が無いときの、ブロック解除の長押し確認 */
export interface UnblockConfirmSettings {
  holdSeconds: UnblockHoldSeconds;
}

export interface AppSettings {
  schedules: Schedule[];
  /** true = すべてのブロックを一時停止中 */
  paused: boolean;
  notifications: NotificationSettings;
  password: PasswordSettings;
  unblockConfirm: UnblockConfirmSettings;
  /** 未設定・null = 未決定（同意モーダルを出す） */
  analyticsOptIn?: import('./analytics').AnalyticsOptIn | null;
}

/** 分析タブの支援誘導の表示状態 */
export interface SupportPromptState {
  /** 最後に閉じた時刻（epoch ms）。閉じていなければ null */
  dismissedAt: number | null;
  /** 支援ページを開いたか。true なら以降は表示しない */
  opened: boolean;
}

export interface StorageSchema {
  settings: AppSettings;
  vision: VisionSettings;
  sites: TrackedSites;
  activity: ActivityLog;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  timeLimitEnabled: true,
  timeLimitMinutes: 5
};

export const DEFAULT_PASSWORD_SETTINGS: PasswordSettings = {
  enabled: false,
  passwordHash: null
};

export const DEFAULT_UNBLOCK_CONFIRM_SETTINGS: UnblockConfirmSettings = {
  holdSeconds: 5
};

export const DEFAULT_SUPPORT_PROMPT_STATE: SupportPromptState = {
  dismissedAt: null,
  opened: false
};

export const DEFAULT_SETTINGS: AppSettings = {
  schedules: [],
  paused: false,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  password: DEFAULT_PASSWORD_SETTINGS,
  unblockConfirm: DEFAULT_UNBLOCK_CONFIRM_SETTINGS
};

/** 共有される既定値。書き手は複製してから書き換える */
export const DEFAULT_SITES: TrackedSites = {};

/** 共有される既定値。書き手は複製してから書き換える */
export const DEFAULT_ACTIVITY: ActivityLog = {};
