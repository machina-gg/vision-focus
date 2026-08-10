// Vision/Dashboard-related type definitions

// Import types needed for this file
import type { FontSettings } from './font';
import { DEFAULT_FONT_SETTINGS } from './font';

// Dashboard display settings (shared between default and presets)
export interface DashboardDisplaySettings {
  goalText: string;
  goalSubText: string;
  textColor: string;
  backgroundType: 'image' | 'color';
  backgroundImage: string;
  backgroundColor: string;
  customBackgroundData: string | null;
  fontSettings: FontSettings;
}

// Dashboard preset - saves all dashboard settings as a set
export interface DashboardPreset extends DashboardDisplaySettings {
  id: string;
  name: string;
  createdAt: string;
}

// Vision/Dashboard settings
export interface VisionSettings {
  // Default display settings (used when no preset is active)
  defaultSettings: DashboardDisplaySettings;
  // User-created presets
  presets: DashboardPreset[];
  // Currently active preset ID (null = use defaultSettings)
  activePresetId: string | null;
}

// Default values
export const DEFAULT_DISPLAY_SETTINGS: DashboardDisplaySettings = {
  goalText: '',
  goalSubText: '',
  textColor: '#ffffff',
  backgroundType: 'image',
  backgroundImage: 'default-1',
  backgroundColor: '#1a1a2e',
  customBackgroundData: null,
  fontSettings: DEFAULT_FONT_SETTINGS
};

export const DEFAULT_VISION: VisionSettings = {
  defaultSettings: DEFAULT_DISPLAY_SETTINGS,
  presets: [],
  activePresetId: null
};
