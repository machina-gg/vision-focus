import type {
  DashboardPreset,
  DashboardDisplaySettings
} from '~/types/storage';

/** プリセットから表示に使う項目だけを取り出す */
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
