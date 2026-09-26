// Storage types and defaults

// Re-export from font.ts for backwards compatibility
export {
  type FontFamily,
  type FontCategory,
  type FontSize,
  type FontWeight,
  type FontSettings,
  type FontDefinition,
  FONT_CATEGORIES,
  getFontDefinition,
  getFontCategory,
  getFontFamilyCSS,
  FONT_FAMILY_MAP,
  FONT_SIZE_MAP,
  FONT_WEIGHT_MAP,
  FONT_FAMILY_NAMES,
  DEFAULT_FONT_SETTINGS
} from './font';

// Re-export from report.ts for backwards compatibility
export { type WeeklyReport, type MonthlyReport } from './report';

// Re-export from analytics.ts for backwards compatibility
export {
  type TimeLimitType,
  type TimeLimit,
  type AnalyticsOptIn
} from './analytics';

// Re-export from vision.ts for backwards compatibility
export {
  type DashboardDisplaySettings,
  type DashboardPreset,
  type VisionSettings,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_VISION
} from './vision';

// Import types needed for this file
import type { VisionSettings } from './vision';
import { DEFAULT_VISION } from './vision';
import type { ActivityLog } from './activity';
import type { TrackedSites } from './site';

// Schedule for time-based blocking
export interface Schedule {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  enabled: boolean;
  presetId?: string; // Dashboard preset to apply when schedule is active
}

// 対応している UI 言語。
// 保存はしない（表示言語はブラウザの設定で決まる）。日付・数値の整形に渡す値として
// `src/lib/i18n.ts` の getUILanguage が返す
export type SupportedLanguage = 'en' | 'ja';

// Notification settings
export type NotificationMinutes = 1 | 3 | 5 | 10;

export interface NotificationSettings {
  timeLimitEnabled: boolean; // Enable/disable time limit notifications
  timeLimitMinutes: NotificationMinutes; // Minutes before limit to notify (1, 3, 5, 10)
}

// Password protection settings for unblock operations
export interface PasswordSettings {
  enabled: boolean; // Whether password protection is enabled
  passwordHash: string | null; // SHA-256 hash of the password (null if not set)
}

// ブロック解除の長押し確認に要る秒数。選べる値だけを型で縛る
export type UnblockHoldSeconds = 5 | 10 | 30 | 60;

// 設定画面の選択肢と取り込み時の検証が同じ値の集合を見るよう、ここだけに並べる
export const UNBLOCK_HOLD_SECONDS_OPTIONS: readonly UnblockHoldSeconds[] = [
  5, 10, 30, 60
];

// パスワード保護が無効なときのブロック解除確認（長押し）の設定
export interface UnblockConfirmSettings {
  holdSeconds: UnblockHoldSeconds;
}

// 全サイトに共通の設定。サイトごとの設定（ブロック・時間制限・YouTube 機能）は `sites` が持つ
export interface AppSettings {
  schedules: Schedule[];
  paused: boolean; // Global pause for all blocking
  notifications: NotificationSettings; // Notification preferences
  password: PasswordSettings; // Password protection for unblock operations
  unblockConfirm: UnblockConfirmSettings; // ブロック解除の長押し確認の設定
  analyticsOptIn?: import('./analytics').AnalyticsOptIn | null; // null = not yet decided (show modal)
}

// 支援誘導（レポート下のバナー）の表示状態
// 追跡は行わない。保存するのは「閉じた時刻」と「支援ページを開いたか」だけ
export interface SupportPromptState {
  /** 最後に閉じた時刻（epoch ms）。未操作なら null */
  dismissedAt: number | null;
  /** 支援ページを開いたことがあるか。true なら以降は表示しない */
  opened: boolean;
}

// Complete storage schema
export interface StorageSchema {
  settings: AppSettings;
  vision: VisionSettings;
  sites: TrackedSites;
  activity: ActivityLog;
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  timeLimitEnabled: true, // Enabled by default
  timeLimitMinutes: 5 // Notify 5 minutes before limit
};

// Default password settings
export const DEFAULT_PASSWORD_SETTINGS: PasswordSettings = {
  enabled: false,
  passwordHash: null
};

export const DEFAULT_UNBLOCK_CONFIRM_SETTINGS: UnblockConfirmSettings = {
  holdSeconds: 5
};

// 支援誘導の初期状態（未操作）
export const DEFAULT_SUPPORT_PROMPT_STATE: SupportPromptState = {
  dismissedAt: null,
  opened: false
};

// Default values
export const DEFAULT_SETTINGS: AppSettings = {
  schedules: [],
  paused: false,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  password: DEFAULT_PASSWORD_SETTINGS,
  unblockConfirm: DEFAULT_UNBLOCK_CONFIRM_SETTINGS
};

// 追跡中のサイトの初期状態（まだ何も追跡していない）。
// 書き手は読み出した値を複製してから書き換えるので、この値そのものは変更されない
export const DEFAULT_SITES: TrackedSites = {};

// 事実の表の初期状態（まだ何も記録していない）。
// 書き手は読み出した値を複製してから書き換えるので、この値そのものは変更されない
export const DEFAULT_ACTIVITY: ActivityLog = {};

export const DEFAULT_STORAGE: StorageSchema = {
  settings: DEFAULT_SETTINGS,
  vision: DEFAULT_VISION,
  sites: DEFAULT_SITES,
  activity: DEFAULT_ACTIVITY
};
