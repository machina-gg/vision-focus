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

// Import types needed for this file
import type { FontSettings } from './font';
import { DEFAULT_FONT_SETTINGS } from './font';

// Block list item
export interface BlockItem {
  id: string;
  domain: string;
  isWildcard: boolean;
  createdAt: string;
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

// Daily statistics
export interface DailyStat {
  date: string; // YYYY-MM-DD
  wasteTime: number; // seconds
  investTime: number; // seconds
  blockCount: number;
}

// Site time tracking
export interface SiteTime {
  domain: string;
  time: number; // seconds
  category: 'waste' | 'invest' | 'neutral';
  lastUpdated: string;
}

// Site block count tracking (independent of blockList)
export interface SiteBlockCount {
  domain: string;
  count: number; // cumulative block count
  lastBlocked: string; // ISO8601 timestamp
}

// Dashboard display settings (shared between default and presets)
export interface DashboardDisplaySettings {
  goalText: string;
  goalSubText: string;
  textColor: string;
  backgroundType: 'image' | 'color';
  backgroundImage: string;
  backgroundColor: string;
  customBackgroundData: string | null;
  fontSettings: FontSettings;
}

// Dashboard preset - saves all dashboard settings as a set
export interface DashboardPreset extends DashboardDisplaySettings {
  id: string;
  name: string;
  createdAt: string;
}

// Vision/Dashboard settings
export interface VisionSettings {
  // Default display settings (used when no preset is active)
  defaultSettings: DashboardDisplaySettings;
  // User-created presets
  presets: DashboardPreset[];
  // Currently active preset ID (null = use defaultSettings)
  activePresetId: string | null;
}

// App settings
// Supported languages
export type SupportedLanguage = 'en' | 'ja';

export interface AppSettings {
  blockList: BlockItem[];
  schedules: Schedule[];
  paused: boolean; // Global pause for all blocking
  language: SupportedLanguage | null; // null = use browser language
}

// Analytics data
export interface AnalyticsData {
  dailyStats: Record<string, DailyStat>; // key: YYYY-MM-DD
  siteTime: Record<string, SiteTime>; // key: domain
  siteCategories: Record<string, 'waste' | 'invest' | 'neutral'>; // key: domain
  siteBlockCounts: Record<string, SiteBlockCount>; // key: domain (persists even after removal from blockList)
}

// Tracked site - tracks sites from when they are blocked
export interface TrackedSite {
  domain: string;
  status: 'blocked' | 'unblocked'; // Current status
  blockedAt: string; // ISO8601 timestamp when added to blocklist
  unblockedAt: string | null; // ISO8601 timestamp when removed from blocklist (null if still blocked)
  timeAfterUnblock: number; // Cumulative time spent (seconds) after unblocking
  lastActivity: string | null; // ISO8601 timestamp of last activity
}

// Legacy alias for backwards compatibility
export type UnblockedSite = TrackedSite;

// History of unblocked sites
export interface UnblockHistory {
  sites: Record<string, UnblockedSite>; // key: domain
}

// Complete storage schema
export interface StorageSchema {
  settings: AppSettings;
  vision: VisionSettings;
  analytics: AnalyticsData;
  unblockHistory: UnblockHistory;
}

// Default values
export const DEFAULT_SETTINGS: AppSettings = {
  blockList: [],
  schedules: [],
  paused: false,
  language: null // Use browser language by default
};

export const DEFAULT_DISPLAY_SETTINGS: DashboardDisplaySettings = {
  goalText: '',
  goalSubText: '',
  textColor: '#ffffff',
  backgroundType: 'image',
  backgroundImage: 'default-1',
  backgroundColor: '#1a1a2e',
  customBackgroundData: null,
  fontSettings: DEFAULT_FONT_SETTINGS
};

export const DEFAULT_VISION: VisionSettings = {
  defaultSettings: DEFAULT_DISPLAY_SETTINGS,
  presets: [],
  activePresetId: null
};

// Helper to get current display settings based on activePresetId
export function getCurrentDisplaySettings(
  vision: VisionSettings
): DashboardDisplaySettings {
  if (vision.activePresetId) {
    const preset = vision.presets.find((p) => p.id === vision.activePresetId);
    if (preset) {
      return {
        goalText: preset.goalText,
        goalSubText: preset.goalSubText,
        textColor: preset.textColor,
        backgroundType: preset.backgroundType,
        backgroundImage: preset.backgroundImage,
        backgroundColor: preset.backgroundColor,
        customBackgroundData: preset.customBackgroundData,
        fontSettings: preset.fontSettings
      };
    }
  }
  return vision.defaultSettings;
}

export const DEFAULT_ANALYTICS: AnalyticsData = {
  dailyStats: {},
  siteTime: {},
  siteCategories: {},
  siteBlockCounts: {}
};

export const DEFAULT_UNBLOCK_HISTORY: UnblockHistory = {
  sites: {}
};

export const DEFAULT_STORAGE: StorageSchema = {
  settings: DEFAULT_SETTINGS,
  vision: DEFAULT_VISION,
  analytics: DEFAULT_ANALYTICS,
  unblockHistory: DEFAULT_UNBLOCK_HISTORY
};
