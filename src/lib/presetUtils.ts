import type {
  DashboardPreset,
  DashboardDisplaySettings
} from '~/types/storage';

/**
 * Convert a preset to display settings
 * Extracts only the display-related properties from a preset
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
