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

export { type WeeklyReport, type MonthlyReport } from './report';

export {
  type TimeLimitType,
  type TimeLimit,
  type AnalyticsOptIn
} from './analytics';

export {
  type DashboardDisplaySettings,
  type DashboardPreset,
  type VisionSettings,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_VISION
} from './vision';

import type { VisionSettings } from './vision';
import { DEFAULT_VISION } from './vision';
import type { ActivityLog } from './activity';
import type { TrackedSites } from './site';

export interface Schedule {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  enabled: boolean;
  presetId?: string;
}

export type SupportedLanguage = 'en' | 'ja';

export type NotificationMinutes = 1 | 3 | 5 | 10;

export interface NotificationSettings {
  timeLimitEnabled: boolean;
  timeLimitMinutes: NotificationMinutes;
}

export interface PasswordSettings {
  enabled: boolean;
  passwordHash: string | null;
}

export type UnblockHoldSeconds = 5 | 10 | 30 | 60;

export const UNBLOCK_HOLD_SECONDS_OPTIONS: readonly UnblockHoldSeconds[] = [
  5, 10, 30, 60
];

export interface UnblockConfirmSettings {
  holdSeconds: UnblockHoldSeconds;
}

export interface AppSettings {
  schedules: Schedule[];
  paused: boolean;
  notifications: NotificationSettings;
  password: PasswordSettings;
  unblockConfirm: UnblockConfirmSettings;
  analyticsOptIn?: import('./analytics').AnalyticsOptIn | null; // null = 未決定（同意モーダルを出す）
}

export interface SupportPromptState {
  /** epoch ms */
  dismissedAt: number | null;
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

// 共有される既定値。書き手は複製してから書き換える
export const DEFAULT_SITES: TrackedSites = {};

// 共有される既定値。書き手は複製してから書き換える
export const DEFAULT_ACTIVITY: ActivityLog = {};

export const DEFAULT_STORAGE: StorageSchema = {
  settings: DEFAULT_SETTINGS,
  vision: DEFAULT_VISION,
  sites: DEFAULT_SITES,
  activity: DEFAULT_ACTIVITY
};
