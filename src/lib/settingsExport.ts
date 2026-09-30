import * as z from 'zod';

import { MAX_IMPORT_SIZE } from '~/constants/limits';
import { isValidDomain, parseDomainInput } from '~/lib/domain';
import {
  findNestingConflict,
  normalizeSiteKey,
  YOUTUBE_DOMAIN
} from '~/lib/siteKey';
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
 * @returns 検証の結果（MAX_IMPORT_SIZE より大きい・JSON でない・形が違う・版が古い・サイトに許されない入れ子の組があるなら success が false）
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

  if (!toImportedSites(result.data.data.sites)) {
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
 * 取り込んだ設定でアプリの設定を置き換える（スケジュールはファイルのもので丸ごと入れ替え、通知と長押し確認は上書き。パスワード・分析の同意は今の値のまま）
 * @param data 取り込む設定ファイルの中身（使うのはスケジュール・通知・長押し確認）
 * @param currentSettings 今のアプリの設定
 * @returns 置き換えた後のアプリの設定（引数は書き換えない）
 */
export function applyImportedSettings(
  data: Pick<ExportedData, 'schedules' | 'notifications' | 'unblockConfirm'>,
  currentSettings: AppSettings
): AppSettings {
  return {
    ...currentSettings,
    schedules: data.schedules,
    notifications: data.notifications,
    unblockConfirm: data.unblockConfirm
  };
}

/** applyImportedVision の結果 */
export interface ImportedVision {
  /** 置き換えた後の表示設定 */
  vision: VisionSettings;
  /** 取り込んだスタイルの画像（キーは新しく振った画像の ID、値は data URL） */
  images: Record<string, string>;
  /** 置き換えで持ち主がいなくなる、今のスタイルの画像の ID */
  removedImageIds: string[];
  /** 上限を超えるため取り込まなかったスタイル（ファイルの並び順） */
  skippedPresets: ExportedPreset[];
}

/**
 * 取り込んだ表示設定で今の表示設定を置き換える（スタイルはファイルの並び順に上限まで取り込み、今のスタイルは画像ごと捨てる。取り込むスタイルの画像は新しい ID で作る。既定の表示設定と適用中のスタイルは上書きし、適用中のスタイルが取り込まなかったものなら null にする）
 * @param data 取り込む設定ファイルの中身（使うのはスタイル・既定の表示設定・適用中のスタイル）
 * @param currentVision 今のダッシュボードの表示設定
 * @param maxPresets スタイルの件数の上限
 * @param createImageId 画像の ID を 1 つ振る関数（呼ぶたびに別の ID を返す）
 * @returns 置き換えた後の表示設定、取り込んだスタイルの画像、捨てる画像の ID、取り込まなかったスタイル（引数は書き換えない）
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
  const skippedPresets = data.presets.slice(maxPresets);

  const images: Record<string, string> = {};
  const presets = data.presets
    .slice(0, maxPresets)
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
      presets,
      defaultSettings: data.defaultDisplaySettings,
      activePresetId: activePresetSkipped ? null : data.activePresetId
    },
    images,
    removedImageIds: currentVision.presets.flatMap((preset) =>
      preset.customBackgroundId === null ? [] : [preset.customBackgroundId]
    ),
    skippedPresets
  };
}

/**
 * 設定ファイルのサイトを、保存する追跡中のサイトの形にする（キーはサイトキーに直し、ドメインとして正しくないものと 2 つ目以降の同じキーは捨てる。youtube.com 以外と許可サイトの YouTube 機能は捨てる）
 * @param sites 設定ファイルのサイト
 * @returns 保存する追跡中のサイト。ファイルの中に許されない入れ子の組があれば null
 */
export function toImportedSites(
  sites: ExportedData['sites']
): TrackedSites | null {
  const result: TrackedSites = {};
  for (const entry of Object.values(sites)) {
    const site = normalizeSiteKey(parseDomainInput(entry.domain).domain);
    if (!isValidDomain(site) || result[site]) continue;
    result[site] = {
      domain: site,
      trackedAt: entry.trackedAt,
      rule: entry.rule,
      youtube:
        site === YOUTUBE_DOMAIN && entry.rule?.kind !== 'allow'
          ? entry.youtube
          : null
    };
  }
  const nested = Object.values(result).some((entry) =>
    findNestingConflict(entry.domain, entry.rule?.kind ?? null, result)
  );
  return nested ? null : result;
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
