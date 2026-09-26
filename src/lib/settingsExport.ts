import * as z from 'zod';

import { TrackedSiteSchema } from '~/types/messageSchemas';
import type { TrackedSites } from '~/types/site';
import type {
  AppSettings,
  VisionSettings,
  Schedule,
  DashboardPreset,
  NotificationSettings,
  UnblockConfirmSettings
} from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SITES,
  DEFAULT_VISION,
  UNBLOCK_HOLD_SECONDS_OPTIONS
} from '~/types/storage';

// 保存形を変えたら上げる。これより古い版のファイルは形式エラーで拒む
export const EXPORT_VERSION = 2;

const MAX_IMPORT_SIZE = 5 * 1024 * 1024;

const LARGE_EXPORT_WARNING_SIZE = 1 * 1024 * 1024;

export interface ExportedSettings {
  version: number;
  exportedAt: string;
  data: {
    sites: TrackedSites;
    schedules: Schedule[];
    presets: DashboardPreset[];
    defaultDisplaySettings: VisionSettings['defaultSettings'];
    activePresetId: string | null;
    notifications: NotificationSettings;
    unblockConfirm: UnblockConfirmSettings;
  };
}

export interface ImportResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  data?: ExportedSettings['data'];
}

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

const unblockConfirmSettingsSchema = z.object({
  holdSeconds: z.literal(UNBLOCK_HOLD_SECONDS_OPTIONS)
});

const exportDataSchema = z.object({
  version: z.number().int().min(EXPORT_VERSION),
  exportedAt: z.string(),
  data: z.object({
    sites: z.record(z.string(), TrackedSiteSchema),
    schedules: z.array(scheduleSchema),
    presets: z.array(presetSchema),
    defaultDisplaySettings: displaySettingsSchema,
    activePresetId: z.string().nullable(),
    notifications: notificationSettingsSchema,
    unblockConfirm: unblockConfirmSettingsSchema
  })
});

export function calculateExportSize(data: ExportedSettings): number {
  return new Blob([JSON.stringify(data)]).size;
}

export function hasLargeCustomBackgrounds(data: ExportedSettings): boolean {
  const size = calculateExportSize(data);
  return size > LARGE_EXPORT_WARNING_SIZE;
}

function getDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function exportSettings(
  settings: AppSettings,
  vision: VisionSettings,
  sites: TrackedSites
): { data: ExportedSettings; isLarge: boolean } {
  const exportData: ExportedSettings = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      sites,
      schedules: settings.schedules,
      presets: vision.presets,
      defaultDisplaySettings: vision.defaultSettings,
      activePresetId: vision.activePresetId,
      notifications: settings.notifications,
      unblockConfirm: settings.unblockConfirm
    }
  };

  const isLarge = hasLargeCustomBackgrounds(exportData);

  return { data: exportData, isLarge };
}

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

export function validateImportedData(jsonString: string): ImportResult {
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

  const result = exportDataSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: 'importErrorInvalidFormat'
    };
  }

  const warnings: string[] = [];

  if (result.data.version > EXPORT_VERSION) {
    warnings.push('importWarningNewerVersion');
  }

  const presetIds = new Set(result.data.data.presets.map((p) => p.id));
  const orphanedSchedules = result.data.data.schedules.filter(
    (s) => s.presetId && !presetIds.has(s.presetId)
  );
  if (orphanedSchedules.length > 0) {
    warnings.push('importWarningOrphanedPresets');
    result.data.data.schedules = result.data.data.schedules.map((s) => ({
      ...s,
      presetId: s.presetId && presetIds.has(s.presetId) ? s.presetId : undefined
    }));
  }

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

export function readFileAsString(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function applyImportedSettings(
  data: ExportedSettings['data'],
  currentSettings: AppSettings,
  currentVision: VisionSettings
): { settings: AppSettings; vision: VisionSettings } {
  const existingScheduleIds = new Set(
    currentSettings.schedules.map((s) => s.id)
  );
  const newSchedules = data.schedules.filter(
    (s) => !existingScheduleIds.has(s.id)
  );
  const mergedSchedules = [...currentSettings.schedules, ...newSchedules];

  const existingPresetIds = new Set(currentVision.presets.map((p) => p.id));
  const newPresets = data.presets.filter((p) => !existingPresetIds.has(p.id));
  const mergedPresets = [...currentVision.presets, ...newPresets];

  const newSettings: AppSettings = {
    ...currentSettings,
    schedules: mergedSchedules,
    notifications: data.notifications,
    unblockConfirm: data.unblockConfirm
  };

  const newVision: VisionSettings = {
    ...currentVision,
    presets: mergedPresets,
    defaultSettings: data.defaultDisplaySettings,
    activePresetId: data.activePresetId
  };

  return { settings: newSettings, vision: newVision };
}

export function createDefaultExportData(): ExportedSettings {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      sites: DEFAULT_SITES,
      schedules: DEFAULT_SETTINGS.schedules,
      presets: DEFAULT_VISION.presets,
      defaultDisplaySettings: DEFAULT_VISION.defaultSettings,
      activePresetId: DEFAULT_VISION.activePresetId,
      notifications: DEFAULT_SETTINGS.notifications,
      unblockConfirm: DEFAULT_SETTINGS.unblockConfirm
    }
  };
}
