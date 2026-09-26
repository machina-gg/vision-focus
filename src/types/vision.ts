import type { FontSettings } from './font';
import { DEFAULT_FONT_SETTINGS } from './font';

/** 新しいタブのダッシュボードに出す目標文と見た目 */
export interface DashboardDisplaySettings {
  /** 大きく出す目標文 */
  goalText: string;
  /** 目標文の下に出す補足の文 */
  goalSubText: string;
  /** CSS の色の値 */
  textColor: string;
  /** image = 背景画像を使う / color = 単色の背景を使う */
  backgroundType: 'image' | 'color';
  /** 同梱の背景画像の ID（getBackgroundUrl で URL にする） */
  backgroundImage: string;
  /** backgroundType が color のときの CSS の色の値 */
  backgroundColor: string;
  /** 利用者が選んだ画像の data URL。あれば backgroundImage より優先。null = 使わない */
  customBackgroundData: string | null;
  /** 目標文のフォント */
  fontSettings: FontSettings;
}

/** 名前を付けて保存した表示設定（画面上の呼称は「スタイル」） */
export interface DashboardPreset extends DashboardDisplaySettings {
  /** スタイルの ID */
  id: string;
  /** 画面に出すスタイルの名前 */
  name: string;
  /** 作成した時刻（ISO8601） */
  createdAt: string;
}

/** ダッシュボードの表示設定とスタイルの一覧 */
export interface VisionSettings {
  /** スタイルを適用していないときの表示設定 */
  defaultSettings: DashboardDisplaySettings;
  /** 保存したスタイル（作成順） */
  presets: DashboardPreset[];
  /** 適用中のスタイルの ID。null = defaultSettings を使う */
  activePresetId: string | null;
}

/** 表示設定の既定値（目標文は空・同梱の既定の背景画像・白文字） */
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

/** ダッシュボードの設定の既定値（スタイル無し・既定の表示設定を使う） */
export const DEFAULT_VISION: VisionSettings = {
  defaultSettings: DEFAULT_DISPLAY_SETTINGS,
  presets: [],
  activePresetId: null
};
