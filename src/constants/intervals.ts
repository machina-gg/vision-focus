/**
 * Application-wide interval and timing constants
 *
 * All time-related magic numbers are centralized here
 * to make tuning and maintenance easier.
 */

// ---------------------------------------------------------------------------
//  Polling intervals (UI)
// ---------------------------------------------------------------------------

/** Polling interval for background stats in the popup (ms) */
export const POPUP_STATS_POLLING_MS = 5_000;

/** Polling interval for background stats in the new-tab page (ms) */
export const NEWTAB_STATS_POLLING_MS = 10_000;

/** Default polling interval for useBackgroundStats hook (ms) */
export const DEFAULT_STATS_POLLING_MS = 10_000;

/** Polling interval for current-domain / time-limit info in popup (ms) */
export const DOMAIN_POLLING_MS = 10_000;

/** Interval for refreshing the current time display in WeeklyCalendar (ms) */
export const CURRENT_TIME_REFRESH_MS = 60_000;

// ---------------------------------------------------------------------------
//  Background service delays
// ---------------------------------------------------------------------------

/** Small delay after storage write to ensure it is fully persisted (ms) */
export const STORAGE_SETTLE_DELAY_MS = 100;

/** Timeout to mark storage as loaded for first-time users (ms) */
export const STORAGE_LOADED_TIMEOUT_MS = 100;

/** Background tracker update interval — once per second (ms) */
export const TRACKING_UPDATE_INTERVAL_MS = 1_000;

/** Timeout threshold for stale heartbeat entries (ms) */
export const STALE_ENTRY_TIMEOUT_MS = 60 * 1_000;

// ---------------------------------------------------------------------------
//  Chrome alarm periods
// ---------------------------------------------------------------------------

/** Period for the daily-cleanup alarm (minutes) */
export const ALARM_DAILY_CLEANUP_MINUTES = 60;

/** Period for the check-schedule alarm (minutes) */
export const ALARM_CHECK_SCHEDULE_MINUTES = 1;

/** Period for the time-limit-reset alarm (minutes) */
export const ALARM_TIME_LIMIT_RESET_MINUTES = 1;

// ---------------------------------------------------------------------------
//  Analytics
// ---------------------------------------------------------------------------

/** Fallback maximum history retention when Infinity (days) */
export const MAX_HISTORY_DAYS_FALLBACK = 365;

/** Milliseconds in one day — used for date-diff calculations */
export const MS_PER_DAY = 1_000 * 60 * 60 * 24;

// ---------------------------------------------------------------------------
//  UI feedback delays (status-reset timers)
// ---------------------------------------------------------------------------

/** How long a transient success/error message is shown before resetting (ms) */
export const STATUS_RESET_DELAY_MS = 2_000;

/** How long the analytics refresh spinner stays visible (ms) */
export const REFRESH_SPINNER_DELAY_MS = 500;

/** How long export/import status messages stay visible (ms) */
export const EXPORT_STATUS_DELAY_MS = 3_000;

/** How long share / import messages stay visible (ms) */
export const SHARE_MESSAGE_DELAY_MS = 5_000;
