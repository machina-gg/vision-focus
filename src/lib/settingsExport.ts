import * as z from 'zod';

import { MAX_IMPORT_SIZE } from '~/constants/limits';
import { getTodayKey } from '~/lib/time';
import {
  ExportedDataSchema,
  type ExportedData,
  type ExportedPreset
} from '~/types/messageSchemas';
import type { TrackedSites } from '~/types/site';
import type {
  AppSettings,
  VisionSettings,
  DashboardPreset
} from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SITES,
  DEFAULT_VISION
} from '~/types/storage';

/** 設定ファイルの形式の版。保存形を変えたら上げる。これより古い版のファイルは形式エラーで拒む */
export const EXPORT_VERSION = 4;

const BYTES_PER_MB = 1024 * 1024;

const LARGE_EXPORT_WARNING_SIZE = 1 * 1024 * 1024;

const exportFileSchema = z.object({
  /** 書き出したときの形式の版（EXPORT_VERSION） */
  version: z.number().int().min(EXPORT_VERSION),
  /** 書き出した時刻（ISO8601） */
  exportedAt: z.string(),
  /** 設定の中身 */
  data: ExportedDataSchema
});

/** 設定ファイル（JSON）の形（exportFileSchema を通った値） */
export type ExportedSettings = z.infer<typeof exportFileSchema>;

/** validateImportedData の結果。error と warnings は i18n のキー */
export interface ImportResult {
  /** 取り込める中身なら true */
  success: boolean;
  /** 取り込めない理由の i18n のキー（success が false のときだけ） */
  error?: string;
  /** error の文言に差し込む値（無ければ無い） */
  errorSubstitutions?: string[];
  /** 取り込めるが知らせることの i18n のキー（無ければ無い） */
  warnings?: string[];
  /** 検証し、参照先の無いプリセット ID を外した中身（success が true のときだけ） */
  data?: ExportedData;
}

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

function toExportedPreset(
  preset: DashboardPreset,
  images: Readonly<Record<string, string>>
): ExportedPreset {
  const { customBackgroundId, ...rest } = preset;
  return {
    ...rest,
    customBackgroundData:
      customBackgroundId === null ? null : (images[customBackgroundId] ?? null)
  };
}

/**
 * 今の設定から設定ファイルの中身を作る（スタイルの画像は data URL で含める。isLarge は大きすぎる警告を出すか）
 * @param settings 今のアプリの設定
 * @param vision 今のダッシュボードの表示設定
 * @param sites 今の追跡中のサイト
 * @param images スタイルの画像（キーは画像の ID、値は data URL）。無い ID の画像は画像なしとして書く
 * @returns data は設定ファイルの中身、isLarge は大きすぎる警告を出すなら true
 */
export function exportSettings(
  settings: AppSettings,
  vision: VisionSettings,
  sites: TrackedSites,
  images: Readonly<Record<string, string>>
): { data: ExportedSettings; isLarge: boolean } {
  const exportData: ExportedSettings = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      sites,
      schedules: settings.schedules,
      presets: vision.presets.map((preset) => toExportedPreset(preset, images)),
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
  link.download = `visionfocus-settings-${getTodayKey()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 取り込む JSON を検証し、参照先の無いプリセット ID を外した中身を返す
 * @param jsonString 設定ファイルの中身の文字列
 * @returns 検証の結果（MAX_IMPORT_SIZE より大きい・JSON でない・形が違う・版が古いなら success が false）
 */
export function validateImportedData(jsonString: string): ImportResult {
  if (jsonString.length > MAX_IMPORT_SIZE) {
    return {
      success: false,
      error: 'importErrorFileTooLarge',
      errorSubstitutions: [String(MAX_IMPORT_SIZE / BYTES_PER_MB)]
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

  const result = exportFileSchema.safeParse(parsed);
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
    data: result.data.data
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
 * 取り込んだ設定をアプリの設定に重ねる（スケジュールは無いものだけ足し、通知と長押し確認は上書き。他の項目は今の値のまま）
 * @param data 取り込む設定ファイルの中身（使うのはスケジュール・通知・長押し確認）
 * @param currentSettings 今のアプリの設定
 * @returns 重ねた後のアプリの設定（引数は書き換えない）
 */
export function applyImportedSettings(
  data: Pick<ExportedData, 'schedules' | 'notifications' | 'unblockConfirm'>,
  currentSettings: AppSettings
): AppSettings {
  const existingScheduleIds = new Set(
    currentSettings.schedules.map((s) => s.id)
  );
  const newSchedules = data.schedules.filter(
    (s) => !existingScheduleIds.has(s.id)
  );

  return {
    ...currentSettings,
    schedules: [...currentSettings.schedules, ...newSchedules],
    notifications: data.notifications,
    unblockConfirm: data.unblockConfirm
  };
}

/** applyImportedVision の結果 */
export interface ImportedVision {
  /** 重ねた後の表示設定 */
  vision: VisionSettings;
  /** 足したスタイルの画像（キーは新しく振った画像の ID、値は data URL） */
  images: Record<string, string>;
  /** 上限を超えるため足さなかったスタイル（ファイルの並び順） */
  skippedPresets: ExportedPreset[];
}

/**
 * 取り込んだ表示設定を今の表示設定に重ねる（既存のスタイルは残し、ID が重ならないスタイルをファイルの並び順に上限まで足す。足すスタイルの画像は新しい ID で作る。既定の表示設定と適用中のスタイルは上書きし、適用中のスタイルが足さなかったものなら null にする）
 * @param data 取り込む設定ファイルの中身（使うのはスタイル・既定の表示設定・適用中のスタイル）
 * @param currentVision 今のダッシュボードの表示設定
 * @param maxPresets スタイルの件数の上限（既存と合わせた数）
 * @param createImageId 画像の ID を 1 つ振る関数（呼ぶたびに別の ID を返す）
 * @returns 重ねた後の表示設定、足したスタイルの画像、足さなかったスタイル（引数は書き換えない）
 */
export function applyImportedVision(
  data: Pick<
    ExportedData,
    'presets' | 'defaultDisplaySettings' | 'activePresetId'
  >,
  currentVision: VisionSettings,
  maxPresets: number,
  createImageId: () => string
): ImportedVision {
  const existingPresetIds = new Set(currentVision.presets.map((p) => p.id));
  const newPresets = data.presets.filter((p) => !existingPresetIds.has(p.id));
  const room = Math.max(0, maxPresets - currentVision.presets.length);
  const skippedPresets = newPresets.slice(room);

  const images: Record<string, string> = {};
  const addedPresets = newPresets
    .slice(0, room)
    .map(({ customBackgroundData, ...rest }): DashboardPreset => {
      if (customBackgroundData === null) {
        return { ...rest, customBackgroundId: null };
      }
      const imageId = createImageId();
      images[imageId] = customBackgroundData;
      return { ...rest, customBackgroundId: imageId };
    });

  const activePresetSkipped = skippedPresets.some(
    (p) => p.id === data.activePresetId
  );

  return {
    vision: {
      ...currentVision,
      presets: [...currentVision.presets, ...addedPresets],
      defaultSettings: data.defaultDisplaySettings,
      activePresetId: activePresetSkipped ? null : data.activePresetId
    },
    images,
    skippedPresets
  };
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
      presets: [],
      defaultDisplaySettings: DEFAULT_VISION.defaultSettings,
      activePresetId: DEFAULT_VISION.activePresetId,
      notifications: DEFAULT_SETTINGS.notifications,
      unblockConfirm: DEFAULT_SETTINGS.unblockConfirm
    }
  };
}
