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
