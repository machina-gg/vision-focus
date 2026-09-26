export const IMAGE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  TARGET_SIZE: 1 * 1024 * 1024,
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,
  SUPPORTED_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const
} as const;

export const BLOCKER_CONFIG = {
  RULE_ID_OFFSET: 1000,
  URL_FILTER_PREFIX: '||'
} as const;

export const TRACKER_CONFIG = {
  ACTIVITY_TIMEOUT_MS: 30 * 1000,
  HEARTBEAT_INTERVAL_MS: 5 * 1000,
  RECORDING_INTERVAL_MS: 5 * 1000,
  HEARTBEAT_TIMEOUT_MS: 10 * 1000
} as const;

export const TIME_LIMIT_CONFIG = {
  MIN_LIMIT_SECONDS: 60,
  MAX_LIMIT_SECONDS: 24 * 60 * 60,
  DEFAULT_DAILY_LIMIT: 30 * 60,
  WARNING_THRESHOLD: 0.2,
  DAILY_PRESET_MINUTES: [5, 15, 30, 60] as const
} as const;

export function roundToNearestPreset(minutes: number): number {
  const presets = TIME_LIMIT_CONFIG.DAILY_PRESET_MINUTES;

  return presets.reduce((nearest, preset) => {
    return Math.abs(preset - minutes) < Math.abs(nearest - minutes)
      ? preset
      : nearest;
  }, presets[0]);
}

/** 選択ボタンを横並びで表示する UI の都合による上限 */
export const MAX_PRESETS = 10;
