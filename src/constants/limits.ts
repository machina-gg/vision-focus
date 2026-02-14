/**
 * Application-wide limits and thresholds
 */

// Image upload limits
export const IMAGE_LIMITS = {
  /** Maximum file size before compression (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  /** Target size after compression (1MB) */
  TARGET_SIZE: 1 * 1024 * 1024,
  /** Maximum image width */
  MAX_WIDTH: 1920,
  /** Maximum image height */
  MAX_HEIGHT: 1080,
  /** Supported MIME types */
  SUPPORTED_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const
} as const;

// Blocker rule configuration
export const BLOCKER_CONFIG = {
  /** Offset for dynamic rule IDs */
  RULE_ID_OFFSET: 1000,
  /** URL filter prefix for declarativeNetRequest */
  URL_FILTER_PREFIX: '||'
} as const;

// Analytics configuration
export const ANALYTICS_CONFIG = {
  /** Threshold for determining trend changes (10%) */
  TREND_CHANGE_THRESHOLD: 0.1,
  /** Number of top sites to show in reports */
  TOP_SITES_LIMIT: 5
} as const;

// Tracker configuration
export const TRACKER_CONFIG = {
  /** Consider user inactive after this many ms of no activity */
  ACTIVITY_TIMEOUT_MS: 30 * 1000,
  /** Send heartbeat every this many ms when active */
  HEARTBEAT_INTERVAL_MS: 5 * 1000,
  /** Recording interval in background (5 seconds) */
  RECORDING_INTERVAL_MS: 5 * 1000,
  /** Consider page stale after this many ms without heartbeat */
  HEARTBEAT_TIMEOUT_MS: 10 * 1000
} as const;

// Domain validation
export const DOMAIN_CONFIG = {
  /** Wildcard prefix for subdomains */
  WILDCARD_PREFIX: '*.',
  /** Maximum domain length */
  MAX_DOMAIN_LENGTH: 253,
  /** Maximum label length (each part between dots) */
  MAX_LABEL_LENGTH: 63
} as const;

// Time limit configuration
export const TIME_LIMIT_CONFIG = {
  /** Minimum limit in seconds (1 minute) */
  MIN_LIMIT_SECONDS: 60,
  /** Maximum limit in seconds (24 hours) */
  MAX_LIMIT_SECONDS: 24 * 60 * 60,
  /** Default daily limit in seconds (30 minutes) */
  DEFAULT_DAILY_LIMIT: 30 * 60,
  /** Default hourly limit in seconds (10 minutes) */
  DEFAULT_HOURLY_LIMIT: 10 * 60,
  /** Warning threshold (show warning when remaining is below this percentage) */
  WARNING_THRESHOLD: 0.2,
  /** Preset daily limit options in minutes */
  DAILY_PRESET_MINUTES: [5, 15, 30, 60] as const,
  /** Preset hourly limit options in minutes */
  HOURLY_PRESET_MINUTES: [5, 10, 15, 30] as const
} as const;

/**
 * 既存の制限時間を最も近いプリセット値に丸める
 * @param minutes - 現在の制限時間（分）
 * @param type - 制限タイプ（daily または hourly）
 * @returns 最も近いプリセット値（分）
 */
export function roundToNearestPreset(
  minutes: number,
  type: 'daily' | 'hourly'
): number {
  const presets =
    type === 'daily'
      ? TIME_LIMIT_CONFIG.DAILY_PRESET_MINUTES
      : TIME_LIMIT_CONFIG.HOURLY_PRESET_MINUTES;

  // 最も近いプリセット値を見つける
  return presets.reduce((nearest, preset) => {
    return Math.abs(preset - minutes) < Math.abs(nearest - minutes)
      ? preset
      : nearest;
  }, presets[0]);
}
