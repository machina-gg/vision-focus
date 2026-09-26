import type { FontSettings } from './font';
import { DEFAULT_FONT_SETTINGS } from './font';

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

export interface DashboardPreset extends DashboardDisplaySettings {
  id: string;
  name: string;
  createdAt: string;
}

export interface VisionSettings {
  defaultSettings: DashboardDisplaySettings;
  presets: DashboardPreset[];
  activePresetId: string | null;
}

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
