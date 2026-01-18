import { Storage } from '@plasmohq/storage'

import {
  DEFAULT_ANALYTICS,
  DEFAULT_DEV_MODE,
  DEFAULT_LICENSE,
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  type AnalyticsData,
  type AppSettings,
  type DevModeSettings,
  type LicenseInfo,
  type StorageSchema,
  type TempUnblock,
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
  license: 'license',
  devMode: 'devMode',
  tempUnblocks: 'tempUnblocks',
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

// Get license info
export async function getLicense(): Promise<LicenseInfo> {
  const data = await storage.get<LicenseInfo>(KEYS.license)
  return data ?? DEFAULT_LICENSE
}

// Set license info
export async function setLicense(license: LicenseInfo): Promise<void> {
  await storage.set(KEYS.license, license)
}

// Get dev mode settings
export async function getDevMode(): Promise<DevModeSettings> {
  const data = await storage.get<DevModeSettings>(KEYS.devMode)
  return data ?? DEFAULT_DEV_MODE
}

// Set dev mode settings
export async function setDevMode(devMode: DevModeSettings): Promise<void> {
  await storage.set(KEYS.devMode, devMode)
}

// Get temp unblocks
export async function getTempUnblocks(): Promise<TempUnblock[]> {
  const data = await storage.get<TempUnblock[]>(KEYS.tempUnblocks)
  return data ?? []
}

// Set temp unblocks
export async function setTempUnblocks(
  tempUnblocks: TempUnblock[]
): Promise<void> {
  await storage.set(KEYS.tempUnblocks, tempUnblocks)
}

// Add temp unblock
export async function addTempUnblock(
  domain: string,
  durationMs: number
): Promise<void> {
  const tempUnblocks = await getTempUnblocks()
  const expiresAt = new Date(Date.now() + durationMs).toISOString()

  // Remove existing entry for this domain if any
  const filtered = tempUnblocks.filter((t) => t.domain !== domain)
  filtered.push({ domain, expiresAt })

  await setTempUnblocks(filtered)
}

// Check if domain is temporarily unblocked
export async function isTempUnblocked(domain: string): Promise<boolean> {
  const tempUnblocks = await getTempUnblocks()
  const now = new Date()

  const entry = tempUnblocks.find((t) => t.domain === domain)
  if (!entry) return false

  return new Date(entry.expiresAt) > now
}

// Clean up expired temp unblocks
export async function cleanupTempUnblocks(): Promise<void> {
  const tempUnblocks = await getTempUnblocks()
  const now = new Date()

  const valid = tempUnblocks.filter((t) => new Date(t.expiresAt) > now)

  if (valid.length !== tempUnblocks.length) {
    await setTempUnblocks(valid)
  }
}

// Get all storage data
export async function getAllStorage(): Promise<StorageSchema> {
  const [settings, vision, analytics, license, devMode, tempUnblocks] =
    await Promise.all([
      getSettings(),
      getVision(),
      getAnalytics(),
      getLicense(),
      getDevMode(),
      getTempUnblocks(),
    ])

  return { settings, vision, analytics, license, devMode, tempUnblocks }
}

// Clear all storage (for debugging)
export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    storage.remove(KEYS.settings),
    storage.remove(KEYS.vision),
    storage.remove(KEYS.analytics),
    storage.remove(KEYS.license),
    storage.remove(KEYS.devMode),
    storage.remove(KEYS.tempUnblocks),
  ])
}

// Export storage instance for direct use with hooks
export { storage }
