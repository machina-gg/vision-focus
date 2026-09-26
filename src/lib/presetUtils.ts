import type {
  DashboardPreset,
  DashboardDisplaySettings
} from '~/types/storage';

/**
 * プリセットから表示に使う項目だけを取り出す
 * @param preset 取り出すプリセット
 * @returns id・名前・作成日時を除いた表示設定
 */
export function presetToDisplaySettings(
  preset: DashboardPreset
): DashboardDisplaySettings {
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
