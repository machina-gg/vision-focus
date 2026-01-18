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

// Goal for multiple goals feature (Premium)
export interface Goal {
  id: string
  text: string
  subText: string
  color: string // hex color
  createdAt: string
  order: number
}

// Font settings for customization (Premium)
export type FontFamily =
  | 'system'
  | 'inter'
  | 'roboto'
  | 'playfair'
  | 'montserrat'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold'

export interface FontSettings {
  family: FontFamily
  size: FontSize
  weight: FontWeight
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
  goalText: string
  goalSubText: string // sub-message/detail
  textColor: string // hex color for goal text
  backgroundType: 'image' | 'color'
  backgroundImage: string // 'default-1' | 'default-2' | 'default-3' | custom URL
  backgroundColor: string // hex color (e.g., '#1a1a2e')
  // Premium features
  customBackgroundData: string | null // Base64 data URL for uploaded images
  fontSettings: FontSettings
  goals: Goal[] // Multiple goals (free: 1, premium: unlimited)
}

// App settings
export interface AppSettings {
  blockList: BlockItem[]
  schedules: Schedule[]
  lockdownMode: boolean
  lockdownEndTime: string | null
  challengeEnabled: boolean
}

// Analytics data
export interface AnalyticsData {
  dailyStats: Record<string, DailyStat> // key: YYYY-MM-DD
  siteTime: Record<string, SiteTime> // key: domain
  siteCategories: Record<string, 'waste' | 'invest' | 'neutral'> // key: domain
}

// License types
export type LicenseType = 'free' | 'monthly' | 'yearly' | 'lifetime'
export type LicenseSource = 'gumroad' | 'dev' | 'promo'

// License info
export interface LicenseInfo {
  isPremium: boolean
  type: LicenseType
  source: LicenseSource | null
  expiresAt: string | null
  gracePeriodEndsAt: string | null
  licenseKey: string | null // hashed
  activatedAt: string | null
  lastVerifiedAt: string | null
  verificationFailCount: number
}

// Dev mode settings
export interface DevModeSettings {
  enabled: boolean
  enabledAt: string | null
  expiresAt: string | null // auto-disable after 24 hours
}

// Premium feature identifiers
export type PremiumFeature =
  | 'unlimited_blocklist'
  | 'hardmode'
  | 'custom_background'
  | 'unsplash'
  | 'unlimited_history'
  | 'weekly_report'
  | 'monthly_report'
  | 'github_integration'
  | 'multiple_goals'
  | 'font_customization'

// Temporary unblock info
export interface TempUnblock {
  domain: string
  expiresAt: string // ISO string
}

// Complete storage schema
export interface StorageSchema {
  settings: AppSettings
  vision: VisionSettings
  analytics: AnalyticsData
  license: LicenseInfo
  devMode: DevModeSettings
  tempUnblocks: TempUnblock[]
}

// Default values
export const DEFAULT_SETTINGS: AppSettings = {
  blockList: [],
  schedules: [],
  lockdownMode: false,
  lockdownEndTime: null,
  challengeEnabled: true,
}

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  family: 'system',
  size: 'md',
  weight: 'bold',
}

export const DEFAULT_VISION: VisionSettings = {
  goalText: 'Focus on your goals',
  goalSubText: '',
  textColor: '#ffffff',
  backgroundType: 'image',
  backgroundImage: 'default-1',
  backgroundColor: '#1a1a2e',
  // Premium features
  customBackgroundData: null,
  fontSettings: DEFAULT_FONT_SETTINGS,
  goals: [],
}

export const DEFAULT_ANALYTICS: AnalyticsData = {
  dailyStats: {},
  siteTime: {},
  siteCategories: {},
}

export const DEFAULT_LICENSE: LicenseInfo = {
  isPremium: false,
  type: 'free',
  source: null,
  expiresAt: null,
  gracePeriodEndsAt: null,
  licenseKey: null,
  activatedAt: null,
  lastVerifiedAt: null,
  verificationFailCount: 0,
}

export const DEFAULT_DEV_MODE: DevModeSettings = {
  enabled: false,
  enabledAt: null,
  expiresAt: null,
}

export const DEFAULT_STORAGE: StorageSchema = {
  settings: DEFAULT_SETTINGS,
  vision: DEFAULT_VISION,
  analytics: DEFAULT_ANALYTICS,
  license: DEFAULT_LICENSE,
  devMode: DEFAULT_DEV_MODE,
  tempUnblocks: [],
}

// Feature limits type
export interface FeatureLimits {
  maxBlockList: number
  historyDays: number
  maxGoals: number
}

// Feature limits
export const FEATURE_LIMITS: {
  free: FeatureLimits
  premium: FeatureLimits
} = {
  free: {
    maxBlockList: 5,
    historyDays: 7,
    maxGoals: 1,
  },
  premium: {
    maxBlockList: Infinity,
    historyDays: Infinity,
    maxGoals: Infinity,
  },
}

// Legacy export for backwards compatibility
export const FREE_TIER_LIMITS = FEATURE_LIMITS.free

// Challenge text for unblocking
export const CHALLENGE_TEXT = 'I choose to focus on my goals'

// Temp unblock duration (5 minutes)
export const TEMP_UNBLOCK_DURATION_MS = 5 * 60 * 1000

// Font family CSS mappings
export const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  system: 'ui-sans-serif, system-ui, sans-serif',
  inter: "'Inter', sans-serif",
  roboto: "'Roboto', sans-serif",
  playfair: "'Playfair Display', serif",
  montserrat: "'Montserrat', sans-serif",
}

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

// Font family display names
export const FONT_FAMILY_NAMES: Record<FontFamily, string> = {
  system: 'System Default',
  inter: 'Inter',
  roboto: 'Roboto',
  playfair: 'Playfair Display',
  montserrat: 'Montserrat',
}
