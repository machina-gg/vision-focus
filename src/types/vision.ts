import type { FontSettings } from './font';
import { DEFAULT_FONT_SETTINGS } from './font';

/** 新しいタブのダッシュボードに出す目標文と見た目 */
export interface DashboardDisplaySettings {
  goalText: string;
  goalSubText: string;
  /** CSS の色の値 */
  textColor: string;
  backgroundType: 'image' | 'color';
  /** 同梱の背景画像の ID（getBackgroundUrl で URL にする） */
  backgroundImage: string;
  /** backgroundType が color のときの CSS の色の値 */
  backgroundColor: string;
  /** 利用者が選んだ画像の data URL。あれば backgroundImage より優先。null = 使わない */
  customBackgroundData: string | null;
  fontSettings: FontSettings;
}

/** 名前を付けて保存した表示設定（画面上の呼称は「スタイル」） */
export interface DashboardPreset extends DashboardDisplaySettings {
  id: string;
  name: string;
  /** ISO8601 */
  createdAt: string;
}

/** ダッシュボードの表示設定とスタイルの一覧 */
export interface VisionSettings {
  /** スタイルを適用していないときの表示設定 */
  defaultSettings: DashboardDisplaySettings;
  presets: DashboardPreset[];
  /** 適用中のスタイルの ID。null = defaultSettings を使う */
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
