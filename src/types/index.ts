// Centralized type exports for vision-focus
// All types are organized by domain and re-exported here for convenience

// Analytics types
export { type AnalyticsOptIn } from './analytics';

// Site types（追跡中のサイトとサイトごとの設定）
export {
  type SiteKey,
  type TimeLimitType,
  type TimeLimit,
  type TrackedSite,
  type TrackedSites,
  type BlockRule,
  type YouTubeFeatures
} from './site';

// Vision/Dashboard types
export {
  type DashboardDisplaySettings,
  type DashboardPreset,
  type VisionSettings,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_VISION
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

// Report types
export { type WeeklyReport, type MonthlyReport } from './report';

// Message types
export {
  type AddBlockRequest,
  type AddBlockResponse,
  type AddTrackedSiteRequest,
  type AddTrackedSiteResponse,
  type RemoveBlockRequest,
  type RemoveBlockResponse,
  type GetRemainingTimeRequest,
  type GetRemainingTimeResponse,
  type ResetActivityResponse,
  type StopTrackingRequest,
  type StopTrackingResponse,
  type ToggleBlockRequest,
  type ToggleBlockResponse,
  type TogglePauseRequest,
  type TogglePauseResponse,
  type TrackerHeartbeatRequest,
  type TrackerHeartbeatResponse,
  type UpdateTimeLimitRequest,
  type UpdateTimeLimitResponse,
  type UpdateYouTubeSettingsRequest,
  type UpdateYouTubeSettingsResponse
} from './messages';

// Storage types (AppSettings and related)
export {
  type Schedule,
  type SupportedLanguage,
  type NotificationMinutes,
  type NotificationSettings,
  type PasswordSettings,
  type AppSettings,
  type SupportPromptState,
  type StorageSchema,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PASSWORD_SETTINGS,
  DEFAULT_SUPPORT_PROMPT_STATE,
  DEFAULT_SETTINGS,
  DEFAULT_SITES,
  DEFAULT_STORAGE
} from './storage';
