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

// Re-export from premium.ts for backwards compatibility
export {
  type PremiumFeature,
  type FeatureLimits,
  FEATURE_LIMITS,
  FREE_TIER_LIMITS
} from './premium';

// Re-export from report.ts for backwards compatibility
export { type WeeklyReport, type MonthlyReport } from './report';

// Re-export from analytics.ts for backwards compatibility
export {
  type DailyStat,
  type SiteTime,
  type SiteBlockCount,
  type SiteUnblockCount,
  type TimeLimitType,
  type TimeLimit,
  type TimeLimitUsage,
  type AnalyticsData,
  type TrackedSite,
  type UnblockedSite,
  type UnblockHistory,
  type AnalyticsOptIn,
  DEFAULT_ANALYTICS,
  DEFAULT_UNBLOCK_HISTORY
} from './analytics';

// Re-export from vision.ts for backwards compatibility
export {
  type DashboardDisplaySettings,
  type DashboardPreset,
  type VisionSettings,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_VISION,
  getCurrentDisplaySettings
} from './vision';

// Import types needed for this file
import type { TimeLimit } from './analytics';
import type { VisionSettings } from './vision';
import type { AnalyticsData } from './analytics';
import type { UnblockHistory } from './analytics';
import { DEFAULT_ANALYTICS, DEFAULT_UNBLOCK_HISTORY } from './analytics';
import { DEFAULT_VISION } from './vision';

// Block list item
export interface BlockItem {
  id: string;
  domain: string;
  isWildcard: boolean;
  createdAt: string;
  enabled: boolean; // Whether blocking is active for this item (default: true)
  timeLimit?: TimeLimit | null; // If null/undefined, site is always blocked when enabled
}

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

// App settings
// Supported languages
export type SupportedLanguage = 'en' | 'ja';

// Notification settings
export type NotificationMinutes = 1 | 3 | 5 | 10;

export interface NotificationSettings {
  timeLimitEnabled: boolean; // Enable/disable time limit notifications
  timeLimitMinutes: NotificationMinutes; // Minutes before limit to notify (1, 3, 5, 10)
}

// YouTube in-app blocking settings
export interface YouTubeSettings {
  enabled: boolean; // Master switch for YouTube blocking features
  blockAccess: boolean; // Block access to YouTube entirely (redirects to block page)
  hideShorts: boolean; // Hide Shorts shelf and tab
  hideRecommendations: boolean; // Hide recommended videos on home and watch pages
  hideComments: boolean; // Hide comment section
  hideSidebar: boolean; // Hide related videos sidebar on watch page
  hideHomeFeed: boolean; // Hide home feed (show only search)
  timeLimit?: TimeLimit | null; // Optional time limit for YouTube usage
}

// Password protection settings for unblock operations
export interface PasswordSettings {
  enabled: boolean; // Whether password protection is enabled
  passwordHash: string | null; // SHA-256 hash of the password (null if not set)
}

export interface AppSettings {
  blockList: BlockItem[];
  schedules: Schedule[];
  paused: boolean; // Global pause for all blocking
  language: SupportedLanguage | null; // null = use browser language
  notifications: NotificationSettings; // Notification preferences
  youtube: YouTubeSettings; // YouTube in-app blocking settings
  password: PasswordSettings; // Password protection for unblock operations
  analyticsOptIn?: import('./analytics').AnalyticsOptIn | null; // null = not yet decided (show modal)
}

// Complete storage schema
export interface StorageSchema {
  settings: AppSettings;
  vision: VisionSettings;
  analytics: AnalyticsData;
  unblockHistory: UnblockHistory;
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  timeLimitEnabled: true, // Enabled by default
  timeLimitMinutes: 5 // Notify 5 minutes before limit
};

// Default YouTube settings
export const DEFAULT_YOUTUBE_SETTINGS: YouTubeSettings = {
  enabled: false, // Disabled by default
  blockAccess: false, // Do not block access by default
  hideShorts: false,
  hideRecommendations: false,
  hideComments: false,
  hideSidebar: false,
  hideHomeFeed: false,
  timeLimit: null
};

// Default password settings
export const DEFAULT_PASSWORD_SETTINGS: PasswordSettings = {
  enabled: false,
  passwordHash: null
};

// Default values
export const DEFAULT_SETTINGS: AppSettings = {
  blockList: [],
  schedules: [],
  paused: false,
  language: null, // Use browser language by default
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  youtube: DEFAULT_YOUTUBE_SETTINGS,
  password: DEFAULT_PASSWORD_SETTINGS
};

export const DEFAULT_STORAGE: StorageSchema = {
  settings: DEFAULT_SETTINGS,
  vision: DEFAULT_VISION,
  analytics: DEFAULT_ANALYTICS,
  unblockHistory: DEFAULT_UNBLOCK_HISTORY
};
