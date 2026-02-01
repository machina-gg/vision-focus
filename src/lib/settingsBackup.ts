/**
 * Settings Export/Import utilities
 * Exports and imports user settings (block list, schedules, presets)
 * Does NOT include: premium status, analytics data
 */

import { z } from 'zod';
import type {
  AppSettings,
  VisionSettings,
  Schedule,
  DashboardPreset
} from '~/types/storage';
import { getSettings, setSettings, getVision, setVision } from './storage';

// Version for future compatibility
const BACKUP_VERSION = 1;

// Maximum file size for import (2MB to accommodate Base64 images)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Schema for validation
const blockItemSchema = z.object({
  id: z.string(),
  domain: z.string(),
  isWildcard: z.boolean(),
  createdAt: z.string()
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

const fontSettingsSchema = z.object({
  family: z.string(),
  size: z.string(),
  weight: z.string()
});

const displaySettingsSchema = z.object({
  goalText: z.string(),
  goalSubText: z.string(),
  textColor: z.string(),
  backgroundType: z.enum(['image', 'color']),
  backgroundImage: z.string(),
  backgroundColor: z.string(),
  customBackgroundData: z.string().nullable(),
  fontSettings: fontSettingsSchema
});

const presetSchema = displaySettingsSchema.extend({
  id: z.string(),
  name: z.string(),
  createdAt: z.string()
});

const backupDataSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  settings: z.object({
    blockList: z.array(blockItemSchema),
    schedules: z.array(scheduleSchema),
    paused: z.boolean(),
    language: z.enum(['en', 'ja']).nullable()
  }),
  vision: z.object({
    defaultSettings: displaySettingsSchema,
    presets: z.array(presetSchema),
    activePresetId: z.string().nullable()
  })
});

export type BackupData = z.infer<typeof backupDataSchema>;

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  imported?: {
    blockList: number;
    schedules: number;
    presets: number;
  };
  error?: string;
}

/**
 * Export settings to JSON file
 */
export async function exportSettings(): Promise<ExportResult> {
  try {
    const [settings, vision] = await Promise.all([getSettings(), getVision()]);

    const backupData: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: {
        blockList: settings.blockList,
        schedules: settings.schedules,
        paused: settings.paused,
        language: settings.language
      },
      vision: {
        defaultSettings: vision.defaultSettings,
        presets: vision.presets,
        activePresetId: vision.activePresetId
      }
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = `visionfocus-backup-${getDateString()}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Import settings from JSON file
 */
export async function importSettings(file: File): Promise<ImportResult> {
  try {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File too large. Maximum size is 2MB.'
      };
    }

    // Validate file type
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      return {
        success: false,
        error: 'Invalid file type. Please select a JSON file.'
      };
    }

    // Read file
    const text = await file.text();
    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: 'Invalid JSON format.'
      };
    }

    // Validate schema
    const result = backupDataSchema.safeParse(parsed);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid backup file format: ${result.error.issues[0]?.message || 'Unknown error'}`
      };
    }

    const backupData = result.data;

    // Get current settings to merge
    const [currentSettings, currentVision] = await Promise.all([
      getSettings(),
      getVision()
    ]);

    // Merge block list (avoid duplicates by domain)
    const existingDomains = new Set(
      currentSettings.blockList.map((item) => item.domain)
    );
    const newBlockItems = backupData.settings.blockList.filter(
      (item) => !existingDomains.has(item.domain)
    );
    const mergedBlockList = [...currentSettings.blockList, ...newBlockItems];

    // Merge schedules (avoid duplicates by id)
    const existingScheduleIds = new Set(
      currentSettings.schedules.map((s) => s.id)
    );
    const newSchedules = backupData.settings.schedules.filter(
      (s) => !existingScheduleIds.has(s.id)
    );
    const mergedSchedules = [...currentSettings.schedules, ...newSchedules];

    // Merge presets (avoid duplicates by id)
    const existingPresetIds = new Set(currentVision.presets.map((p) => p.id));
    const newPresets = backupData.vision.presets.filter(
      (p) => !existingPresetIds.has(p.id)
    );
    const mergedPresets = [...currentVision.presets, ...newPresets];

    // Update settings
    const updatedSettings: AppSettings = {
      ...currentSettings,
      blockList: mergedBlockList,
      schedules: mergedSchedules as Schedule[],
      paused: backupData.settings.paused,
      language: backupData.settings.language
    };

    const updatedVision: VisionSettings = {
      defaultSettings: backupData.vision.defaultSettings,
      presets: mergedPresets as DashboardPreset[],
      activePresetId: backupData.vision.activePresetId
    };

    await Promise.all([setSettings(updatedSettings), setVision(updatedVision)]);

    return {
      success: true,
      imported: {
        blockList: newBlockItems.length,
        schedules: newSchedules.length,
        presets: newPresets.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get current date string for filename
 */
function getDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}
