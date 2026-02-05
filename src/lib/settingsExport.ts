/**
 * Settings Export/Import utilities
 *
 * Exports and imports user settings including:
 * - Block list
 * - Schedules
 * - Presets (with optional custom background images)
 *
 * Note: Premium status is NOT included for security reasons
 */

import * as z from 'zod';

import type {
  AppSettings,
  VisionSettings,
  BlockItem,
  Schedule,
  DashboardPreset,
  NotificationSettings
} from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_NOTIFICATION_SETTINGS
} from '~/types/storage';

// Export data version for future compatibility
const EXPORT_VERSION = 1;

// Maximum file size for import (5MB)
const MAX_IMPORT_SIZE = 5 * 1024 * 1024;

// Size threshold for warning about large exports (1MB)
const LARGE_EXPORT_WARNING_SIZE = 1 * 1024 * 1024;

/**
 * Exported settings data structure
 */
export interface ExportedSettings {
  version: number;
  exportedAt: string;
  data: {
    blockList: BlockItem[];
    schedules: Schedule[];
    presets: DashboardPreset[];
    defaultDisplaySettings: VisionSettings['defaultSettings'];
    activePresetId: string | null;
    language: AppSettings['language'];
    notifications?: NotificationSettings;
  };
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  data?: ExportedSettings['data'];
}

/**
 * Zod schema for validating imported data
 */
const fontSettingsSchema = z.object({
  family: z.string(),
  size: z.enum(['sm', 'md', 'lg', 'xl']),
  weight: z.enum(['normal', 'medium', 'semibold', 'bold'])
});

const displaySettingsSchema = z.object({
  goalText: z.string(),
  goalSubText: z.string(),
  textColor: z.string(),
  backgroundType: z.enum(['image', 'color']),
  backgroundImage: z.string(),
  backgroundColor: z.string(),
  customBackgroundData: z.string().nullable().default(null),
  fontSettings: fontSettingsSchema
});

const timeLimitSchema = z.object({
  type: z.enum(['daily', 'hourly']),
  limitSeconds: z.number()
});

const blockItemSchema = z.object({
  id: z.string(),
  domain: z.string(),
  isWildcard: z.boolean(),
  createdAt: z.string(),
  enabled: z.boolean().optional().default(true),
  timeLimit: timeLimitSchema.nullable().optional()
});

const scheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  days: z.array(z.number()),
  enabled: z.boolean(),
  presetId: z.string().optional()
});

const presetSchema = displaySettingsSchema.extend({
  id: z.string(),
  name: z.string(),
  createdAt: z.string()
});

const notificationSettingsSchema = z.object({
  timeLimitEnabled: z.boolean(),
  timeLimitMinutes: z.union([
    z.literal(1),
    z.literal(3),
    z.literal(5),
    z.literal(10)
  ])
});

const exportDataSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  data: z.object({
    blockList: z.array(blockItemSchema),
    schedules: z.array(scheduleSchema),
    presets: z.array(presetSchema),
    defaultDisplaySettings: displaySettingsSchema,
    activePresetId: z.string().nullable(),
    language: z.enum(['en', 'ja']).nullable(),
    notifications: notificationSettingsSchema.optional()
  })
});

/**
 * Calculate the size of exported data
 */
export function calculateExportSize(data: ExportedSettings): number {
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * Check if exported data contains large custom backgrounds
 */
export function hasLargeCustomBackgrounds(data: ExportedSettings): boolean {
  const size = calculateExportSize(data);
  return size > LARGE_EXPORT_WARNING_SIZE;
}

/**
 * Get date string for filename
 */
function getDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Export settings to JSON file
 */
export function exportSettings(
  settings: AppSettings,
  vision: VisionSettings
): { data: ExportedSettings; isLarge: boolean } {
  const exportData: ExportedSettings = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      blockList: settings.blockList,
      schedules: settings.schedules,
      presets: vision.presets,
      defaultDisplaySettings: vision.defaultSettings,
      activePresetId: vision.activePresetId,
      language: settings.language,
      notifications: settings.notifications
    }
  };

  const isLarge = hasLargeCustomBackgrounds(exportData);

  return { data: exportData, isLarge };
}

/**
 * Download settings as JSON file
 */
export function downloadSettings(data: ExportedSettings): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `visionfocus-settings-${getDateString()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Validate and parse imported JSON
 */
export function validateImportedData(jsonString: string): ImportResult {
  // Check file size
  if (jsonString.length > MAX_IMPORT_SIZE) {
    return {
      success: false,
      error: 'importErrorFileTooLarge'
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      error: 'importErrorInvalidJson'
    };
  }

  // Validate schema
  const result = exportDataSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: 'importErrorInvalidFormat'
    };
  }

  const warnings: string[] = [];

  // Check version compatibility
  if (result.data.version > EXPORT_VERSION) {
    warnings.push('importWarningNewerVersion');
  }

  // Check for orphaned preset references in schedules
  const presetIds = new Set(result.data.data.presets.map((p) => p.id));
  const orphanedSchedules = result.data.data.schedules.filter(
    (s) => s.presetId && !presetIds.has(s.presetId)
  );
  if (orphanedSchedules.length > 0) {
    warnings.push('importWarningOrphanedPresets');
    // Clear orphaned preset references
    result.data.data.schedules = result.data.data.schedules.map((s) => ({
      ...s,
      presetId: s.presetId && presetIds.has(s.presetId) ? s.presetId : undefined
    }));
  }

  // Check if active preset exists
  if (
    result.data.data.activePresetId &&
    !presetIds.has(result.data.data.activePresetId)
  ) {
    warnings.push('importWarningActivePresetNotFound');
    result.data.data.activePresetId = null;
  }

  return {
    success: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    data: result.data.data as unknown as ExportedSettings['data']
  };
}

/**
 * Read file and return as string
 */
export function readFileAsString(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Apply imported settings
 * Returns the new settings and vision objects
 */
export function applyImportedSettings(
  data: ExportedSettings['data'],
  currentSettings: AppSettings,
  currentVision: VisionSettings
): { settings: AppSettings; vision: VisionSettings } {
  // Merge block lists (avoid duplicates by domain)
  const existingDomains = new Set(
    currentSettings.blockList.map((b) => b.domain)
  );
  const newBlockItems = data.blockList.filter(
    (b) => !existingDomains.has(b.domain)
  );
  const mergedBlockList = [...currentSettings.blockList, ...newBlockItems];

  // Merge schedules (avoid duplicates by id)
  const existingScheduleIds = new Set(
    currentSettings.schedules.map((s) => s.id)
  );
  const newSchedules = data.schedules.filter(
    (s) => !existingScheduleIds.has(s.id)
  );
  const mergedSchedules = [...currentSettings.schedules, ...newSchedules];

  // Merge presets (avoid duplicates by id)
  const existingPresetIds = new Set(currentVision.presets.map((p) => p.id));
  const newPresets = data.presets.filter((p) => !existingPresetIds.has(p.id));
  const mergedPresets = [...currentVision.presets, ...newPresets];

  const newSettings: AppSettings = {
    ...currentSettings,
    blockList: mergedBlockList,
    schedules: mergedSchedules,
    language: data.language ?? currentSettings.language,
    notifications:
      data.notifications ??
      currentSettings.notifications ??
      DEFAULT_NOTIFICATION_SETTINGS
  };

  const newVision: VisionSettings = {
    ...currentVision,
    presets: mergedPresets,
    defaultSettings: data.defaultDisplaySettings,
    activePresetId: data.activePresetId
  };

  return { settings: newSettings, vision: newVision };
}

/**
 * Create empty/default export data
 */
export function createDefaultExportData(): ExportedSettings {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      blockList: DEFAULT_SETTINGS.blockList,
      schedules: DEFAULT_SETTINGS.schedules,
      presets: DEFAULT_VISION.presets,
      defaultDisplaySettings: DEFAULT_VISION.defaultSettings,
      activePresetId: DEFAULT_VISION.activePresetId,
      language: DEFAULT_SETTINGS.language,
      notifications: DEFAULT_SETTINGS.notifications
    }
  };
}
