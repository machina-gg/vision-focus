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

/** 設定ファイルの形式の版。保存形を変えたら上げる。これより古い版のファイルは形式エラーで拒む */
export const EXPORT_VERSION = 2;

const MAX_IMPORT_SIZE = 5 * 1024 * 1024;

const LARGE_EXPORT_WARNING_SIZE = 1 * 1024 * 1024;

/** 設定ファイル（JSON）の形 */
export interface ExportedSettings {
  /** 書き出したときの形式の版（EXPORT_VERSION） */
  version: number;
  /** 書き出した時刻（ISO8601） */
  exportedAt: string;
  /** 設定の中身 */
  data: {
    /** 追跡中のサイト */
    sites: TrackedSites;
    /** ブロックが効く時間帯 */
    schedules: Schedule[];
    /** ダッシュボードのスタイル */
    presets: DashboardPreset[];
    /** スタイルを適用していないときの表示設定 */
    defaultDisplaySettings: VisionSettings['defaultSettings'];
    /** 適用中のスタイルの ID（null = defaultDisplaySettings を使う） */
    activePresetId: string | null;
    /** 時間制限の残り時間が少なくなったときの通知の設定 */
    notifications: NotificationSettings;
    /** ブロック解除の長押し確認の設定 */
    unblockConfirm: UnblockConfirmSettings;
  };
}

/** validateImportedData の結果。error と warnings は i18n のキー */
export interface ImportResult {
  /** 取り込める中身なら true */
  success: boolean;
  /** 取り込めない理由の i18n のキー（success が false のときだけ） */
  error?: string;
  /** 取り込めるが知らせることの i18n のキー（無ければ無い） */
  warnings?: string[];
  /** 検証し、参照先の無いプリセット ID を外した中身（success が true のときだけ） */
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

/**
 * 設定ファイルにしたときのバイト数
 * @param data 設定ファイルの中身
 * @returns 整形しない JSON にしたときの UTF-8 のバイト数
 */
export function calculateExportSize(data: ExportedSettings): number {
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * 設定ファイルが大きすぎる警告を出す大きさを超えるか
 * @param data 設定ファイルの中身
 * @returns 警告を出すなら true
 */
export function hasLargeCustomBackgrounds(data: ExportedSettings): boolean {
  const size = calculateExportSize(data);
  return size > LARGE_EXPORT_WARNING_SIZE;
}

function getDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 今の設定から設定ファイルの中身を作る（isLarge は大きすぎる警告を出すか）
 * @param settings 今のアプリの設定
 * @param vision 今のダッシュボードの表示設定
 * @param sites 今の追跡中のサイト
 * @returns data は設定ファイルの中身、isLarge は大きすぎる警告を出すなら true
 */
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

/**
 * 設定ファイルを JSON でダウンロードする
 * @param data 設定ファイルの中身
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
 * 取り込む JSON を検証し、参照先の無いプリセット ID を外した中身を返す
 * @param jsonString 設定ファイルの中身の文字列
 * @returns 検証の結果（大きすぎる・JSON でない・形が違う・版が古いなら success が false）
 */
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

/**
 * ファイルを文字列として読む
 * @param file 読むファイル
 * @returns ファイルの中身（読めなければ reject）
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
 * 取り込んだ設定を今の設定に重ねる（スケジュール・プリセットは無いものだけ足し、他は上書き。追跡中のサイトは扱わない）
 * @param data 取り込む設定ファイルの中身
 * @param currentSettings 今のアプリの設定
 * @param currentVision 今のダッシュボードの表示設定
 * @returns 重ねた後のアプリの設定と表示設定（引数は書き換えない）
 */
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

/**
 * 既定値だけで作った設定ファイルの中身
 * @returns 既定値の設定ファイルの中身（exportedAt は今の時刻）
 */
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
