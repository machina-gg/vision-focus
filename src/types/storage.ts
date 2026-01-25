// Block list item
export interface BlockItem {
  id: string
  domain: string
  isWildcard: boolean
  createdAt: string
}

// Schedule for time-based blocking
export interface Schedule {
  id: string
  name: string
  startTime: string // HH:mm
  endTime: string // HH:mm
  days: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  enabled: boolean
  presetId?: string // Dashboard preset to apply when schedule is active
}

// Daily statistics
export interface DailyStat {
  date: string // YYYY-MM-DD
  wasteTime: number // seconds
  investTime: number // seconds
  blockCount: number
}

// Site time tracking
export interface SiteTime {
  domain: string
  time: number // seconds
  category: 'waste' | 'invest' | 'neutral'
  lastUpdated: string
}

// Dashboard display settings (shared between default and presets)
export interface DashboardDisplaySettings {
  goalText: string
  goalSubText: string
  textColor: string
  backgroundType: 'image' | 'color'
  backgroundImage: string
  backgroundColor: string
  customBackgroundData: string | null
  fontSettings: FontSettings
}

// Dashboard preset - saves all dashboard settings as a set
export interface DashboardPreset extends DashboardDisplaySettings {
  id: string
  name: string
  createdAt: string
}

// Font settings for customization
export type FontFamily =
  | 'system'
  // Modern
  | 'inter'
  | 'roboto'
  | 'poppins'
  | 'lato'
  | 'opensans'
  | 'nunito'
  // Elegant
  | 'playfair'
  | 'merriweather'
  | 'lora'
  | 'crimsontext'
  // Impact
  | 'montserrat'
  | 'oswald'
  | 'bebasneue'
  | 'raleway'
  // Handwriting
  | 'dancingscript'
  | 'caveat'
  // Japanese
  | 'notosansjp'
  | 'notoserifjp'
  | 'mplusrounded'

export type FontCategory =
  | 'system'
  | 'modern'
  | 'elegant'
  | 'impact'
  | 'handwriting'
  | 'japanese'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold'

export interface FontSettings {
  family: FontFamily
  size: FontSize
  weight: FontWeight
}

// Font category definitions
export interface FontDefinition {
  family: FontFamily
  name: string
  css: string
  googleFont?: string // Google Fonts name for loading
}

export const FONT_CATEGORIES: Record<
  FontCategory,
  { name: string; fonts: FontDefinition[] }
> = {
  system: {
    name: 'System',
    fonts: [
      {
        family: 'system',
        name: 'System Default',
        css: 'ui-sans-serif, system-ui, sans-serif',
      },
    ],
  },
  modern: {
    name: 'Modern',
    fonts: [
      {
        family: 'inter',
        name: 'Inter',
        css: "'Inter', sans-serif",
        googleFont: 'Inter',
      },
      {
        family: 'roboto',
        name: 'Roboto',
        css: "'Roboto', sans-serif",
        googleFont: 'Roboto',
      },
      {
        family: 'poppins',
        name: 'Poppins',
        css: "'Poppins', sans-serif",
        googleFont: 'Poppins',
      },
      {
        family: 'lato',
        name: 'Lato',
        css: "'Lato', sans-serif",
        googleFont: 'Lato',
      },
      {
        family: 'opensans',
        name: 'Open Sans',
        css: "'Open Sans', sans-serif",
        googleFont: 'Open+Sans',
      },
      {
        family: 'nunito',
        name: 'Nunito',
        css: "'Nunito', sans-serif",
        googleFont: 'Nunito',
      },
    ],
  },
  elegant: {
    name: 'Elegant',
    fonts: [
      {
        family: 'playfair',
        name: 'Playfair Display',
        css: "'Playfair Display', serif",
        googleFont: 'Playfair+Display',
      },
      {
        family: 'merriweather',
        name: 'Merriweather',
        css: "'Merriweather', serif",
        googleFont: 'Merriweather',
      },
      {
        family: 'lora',
        name: 'Lora',
        css: "'Lora', serif",
        googleFont: 'Lora',
      },
      {
        family: 'crimsontext',
        name: 'Crimson Text',
        css: "'Crimson Text', serif",
        googleFont: 'Crimson+Text',
      },
    ],
  },
  impact: {
    name: 'Impact',
    fonts: [
      {
        family: 'montserrat',
        name: 'Montserrat',
        css: "'Montserrat', sans-serif",
        googleFont: 'Montserrat',
      },
      {
        family: 'oswald',
        name: 'Oswald',
        css: "'Oswald', sans-serif",
        googleFont: 'Oswald',
      },
      {
        family: 'bebasneue',
        name: 'Bebas Neue',
        css: "'Bebas Neue', sans-serif",
        googleFont: 'Bebas+Neue',
      },
      {
        family: 'raleway',
        name: 'Raleway',
        css: "'Raleway', sans-serif",
        googleFont: 'Raleway',
      },
    ],
  },
  handwriting: {
    name: 'Handwriting',
    fonts: [
      {
        family: 'dancingscript',
        name: 'Dancing Script',
        css: "'Dancing Script', cursive",
        googleFont: 'Dancing+Script',
      },
      {
        family: 'caveat',
        name: 'Caveat',
        css: "'Caveat', cursive",
        googleFont: 'Caveat',
      },
    ],
  },
  japanese: {
    name: 'Japanese',
    fonts: [
      {
        family: 'notosansjp',
        name: 'Noto Sans JP',
        css: "'Noto Sans JP', sans-serif",
        googleFont: 'Noto+Sans+JP',
      },
      {
        family: 'notoserifjp',
        name: 'Noto Serif JP',
        css: "'Noto Serif JP', serif",
        googleFont: 'Noto+Serif+JP',
      },
      {
        family: 'mplusrounded',
        name: 'M PLUS Rounded 1c',
        css: "'M PLUS Rounded 1c', sans-serif",
        googleFont: 'M+PLUS+Rounded+1c',
      },
    ],
  },
}

// Helper to get font definition by family
export function getFontDefinition(family: FontFamily): FontDefinition {
  for (const category of Object.values(FONT_CATEGORIES)) {
    const font = category.fonts.find((f) => f.family === family)
    if (font) return font
  }
  return FONT_CATEGORIES.system.fonts[0]
}

// Helper to get category for a font family
export function getFontCategory(family: FontFamily): FontCategory {
  for (const [categoryKey, category] of Object.entries(FONT_CATEGORIES)) {
    if (category.fonts.some((f) => f.family === family)) {
      return categoryKey as FontCategory
    }
  }
  return 'system'
}

// Weekly report (Premium)
export interface WeeklyReport {
  weekStart: string // YYYY-MM-DD
  weekEnd: string // YYYY-MM-DD
  totalWasteTime: number // seconds
  totalInvestTime: number // seconds
  totalBlockCount: number
  dailyBreakdown: DailyStat[]
  topWasteSites: { domain: string; time: number }[]
  topInvestSites: { domain: string; time: number }[]
  trend: 'improving' | 'declining' | 'stable'
}

// Monthly report (Premium)
export interface MonthlyReport {
  month: string // YYYY-MM
  totalWasteTime: number // seconds
  totalInvestTime: number // seconds
  totalBlockCount: number
  weeklyBreakdown: {
    weekStart: string
    wasteTime: number
    investTime: number
  }[]
  topWasteSites: { domain: string; time: number }[]
  topInvestSites: { domain: string; time: number }[]
  trend: 'improving' | 'declining' | 'stable'
}

// Vision/Dashboard settings
export interface VisionSettings {
  // Default display settings (used when no preset is active)
  defaultSettings: DashboardDisplaySettings
  // User-created presets
  presets: DashboardPreset[]
  // Currently active preset ID (null = use defaultSettings)
  activePresetId: string | null
}

// App settings
export interface AppSettings {
  blockList: BlockItem[]
  schedules: Schedule[]
}

// Analytics data
export interface AnalyticsData {
  dailyStats: Record<string, DailyStat> // key: YYYY-MM-DD
  siteTime: Record<string, SiteTime> // key: domain
  siteCategories: Record<string, 'waste' | 'invest' | 'neutral'> // key: domain
}

// Premium feature identifiers
export type PremiumFeature =
  | 'unlimited_blocklist'
  | 'custom_background'
  | 'dashboard_presets'
  | 'unsplash'
  | 'unlimited_history'
  | 'weekly_report'
  | 'monthly_report'
  | 'github_integration'

// Complete storage schema
export interface StorageSchema {
  settings: AppSettings
  vision: VisionSettings
  analytics: AnalyticsData
}

// Default values
export const DEFAULT_SETTINGS: AppSettings = {
  blockList: [],
  schedules: [],
}

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  family: 'system',
  size: 'md',
  weight: 'bold',
}

export const DEFAULT_DISPLAY_SETTINGS: DashboardDisplaySettings = {
  goalText: 'Focus on your goals',
  goalSubText: '',
  textColor: '#ffffff',
  backgroundType: 'image',
  backgroundImage: 'default-1',
  backgroundColor: '#1a1a2e',
  customBackgroundData: null,
  fontSettings: DEFAULT_FONT_SETTINGS,
}

export const DEFAULT_VISION: VisionSettings = {
  defaultSettings: DEFAULT_DISPLAY_SETTINGS,
  presets: [],
  activePresetId: null,
}

// Helper to get current display settings based on activePresetId
export function getCurrentDisplaySettings(
  vision: VisionSettings
): DashboardDisplaySettings {
  if (vision.activePresetId) {
    const preset = vision.presets.find((p) => p.id === vision.activePresetId)
    if (preset) {
      return {
        goalText: preset.goalText,
        goalSubText: preset.goalSubText,
        textColor: preset.textColor,
        backgroundType: preset.backgroundType,
        backgroundImage: preset.backgroundImage,
        backgroundColor: preset.backgroundColor,
        customBackgroundData: preset.customBackgroundData,
        fontSettings: preset.fontSettings,
      }
    }
  }
  return vision.defaultSettings
}

export const DEFAULT_ANALYTICS: AnalyticsData = {
  dailyStats: {},
  siteTime: {},
  siteCategories: {},
}

export const DEFAULT_STORAGE: StorageSchema = {
  settings: DEFAULT_SETTINGS,
  vision: DEFAULT_VISION,
  analytics: DEFAULT_ANALYTICS,
}

// Feature limits type
export interface FeatureLimits {
  maxBlockList: number
  historyDays: number
  maxPresets: number
}

// Feature limits
export const FEATURE_LIMITS: {
  free: FeatureLimits
  premium: FeatureLimits
} = {
  free: {
    maxBlockList: 5,
    historyDays: 7,
    maxPresets: 1,
  },
  premium: {
    maxBlockList: Infinity,
    historyDays: Infinity,
    maxPresets: 5,
  },
}

// Legacy export for backwards compatibility
export const FREE_TIER_LIMITS = FEATURE_LIMITS.free

// Font family CSS mappings (uses new FONT_CATEGORIES)
export const getFontFamilyCSS = (family: FontFamily): string => {
  return getFontDefinition(family).css
}

// Legacy compatibility - dynamically generated
export const FONT_FAMILY_MAP: Record<string, string> = Object.values(
  FONT_CATEGORIES
)
  .flatMap((cat) => cat.fonts)
  .reduce((acc, font) => ({ ...acc, [font.family]: font.css }), {})

// Font size Tailwind class mappings
export const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
}

// Font weight Tailwind class mappings
export const FONT_WEIGHT_MAP: Record<FontWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

// Font family display names (uses new FONT_CATEGORIES)
export const FONT_FAMILY_NAMES: Record<string, string> = Object.values(
  FONT_CATEGORIES
)
  .flatMap((cat) => cat.fonts)
  .reduce((acc, font) => ({ ...acc, [font.family]: font.name }), {})
