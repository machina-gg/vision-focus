// Centralized type exports for vision-focus
// All types are organized by domain and re-exported here for convenience

// Analytics types
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

// Vision/Dashboard types
export {
  type DashboardDisplaySettings,
  type DashboardPreset,
  type VisionSettings,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_VISION,
  getCurrentDisplaySettings
} from './vision';

// Font types
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

// Premium types
export {
  type PremiumFeature,
  type FeatureLimits,
  FEATURE_LIMITS,
  FREE_TIER_LIMITS
} from './premium';

// Report types
export { type WeeklyReport, type MonthlyReport } from './report';

// Message types
export {
  type AddBlockRequest,
  type AddBlockResponse,
  type RemoveBlockRequest,
  type RemoveBlockResponse,
  type GetStatsRequest,
  type GetStatsResponse,
  type SetSiteCategoryRequest,
  type SetSiteCategoryResponse,
  type ToggleBlockRequest,
  type ToggleBlockResponse,
  type TrackerHeartbeatRequest,
  type TrackerHeartbeatResponse
} from './messages';

// Storage types (AppSettings and related)
export {
  type BlockItem,
  type Schedule,
  type SupportedLanguage,
  type NotificationMinutes,
  type NotificationSettings,
  type YouTubeSettings,
  type PasswordSettings,
  type AppSettings,
  type StorageSchema,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_YOUTUBE_SETTINGS,
  DEFAULT_PASSWORD_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_STORAGE
} from './storage';
