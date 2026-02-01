import type {
  DashboardPreset,
  DashboardDisplaySettings,
} from '~/types/storage'

/**
 * Convert a preset to display settings
 * Extracts only the display-related properties from a preset
 */
export function presetToDisplaySettings(
  preset: DashboardPreset,
  isPremium = true
): DashboardDisplaySettings {
  return {
    goalText: preset.goalText,
    goalSubText: preset.goalSubText,
    textColor: preset.textColor,
    backgroundType: preset.backgroundType,
    backgroundImage: preset.backgroundImage,
    backgroundColor: preset.backgroundColor,
    // Custom background requires premium
    customBackgroundData: isPremium ? preset.customBackgroundData : null,
    fontSettings: preset.fontSettings,
  }
}
