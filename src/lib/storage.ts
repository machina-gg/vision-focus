import { Storage } from '@plasmohq/storage'

import {
  DEFAULT_ANALYTICS,
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  type AnalyticsData,
  type AppSettings,
  type StorageSchema,
  type VisionSettings,
} from '~/types/storage'

// Create storage instance
const storage = new Storage({
  area: 'local',
})

// Storage keys
const KEYS = {
  settings: 'settings',
  vision: 'vision',
  analytics: 'analytics',
} as const

// Get settings
export async function getSettings(): Promise<AppSettings> {
  const data = await storage.get<AppSettings>(KEYS.settings)
  return data ?? DEFAULT_SETTINGS
}

// Set settings
export async function setSettings(settings: AppSettings): Promise<void> {
  await storage.set(KEYS.settings, settings)
}

// Update settings partially
export async function updateSettings(
  update: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getSettings()
  const updated = { ...current, ...update }
  await setSettings(updated)
  return updated
}

// Get vision settings
export async function getVision(): Promise<VisionSettings> {
  const data = await storage.get<VisionSettings>(KEYS.vision)
  return data ?? DEFAULT_VISION
}

// Set vision settings
export async function setVision(vision: VisionSettings): Promise<void> {
  await storage.set(KEYS.vision, vision)
}

// Get analytics data
export async function getAnalytics(): Promise<AnalyticsData> {
  const data = await storage.get<AnalyticsData>(KEYS.analytics)
  return data ?? DEFAULT_ANALYTICS
}

// Set analytics data
export async function setAnalytics(analytics: AnalyticsData): Promise<void> {
  await storage.set(KEYS.analytics, analytics)
}

// Get all storage data
export async function getAllStorage(): Promise<StorageSchema> {
  const [settings, vision, analytics] = await Promise.all([
    getSettings(),
    getVision(),
    getAnalytics(),
  ])

  return { settings, vision, analytics }
}

// Clear all storage (for debugging)
export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    storage.remove(KEYS.settings),
    storage.remove(KEYS.vision),
    storage.remove(KEYS.analytics),
  ])
}

// Export storage instance for direct use with hooks
export { storage }
