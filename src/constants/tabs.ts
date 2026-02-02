/**
 * Settings page tab names
 */
export const TABS = [
  'blocklist',
  'styles',
  'schedules',
  'analytics',
  'license',
  'help'
] as const;

/**
 * Type for tab names
 */
export type TabName = (typeof TABS)[number];

/**
 * Default tab when no valid tab is specified
 */
export const DEFAULT_TAB: TabName = 'blocklist';

/**
 * Legacy tab mapping (for backward compatibility)
 */
export const LEGACY_TAB_MAP: Record<string, TabName> = {
  general: 'styles'
} as const;

/**
 * Check if a string is a valid tab name
 */
export function isValidTab(tab: string): tab is TabName {
  return (TABS as readonly string[]).includes(tab);
}

/**
 * Get the tab name from URL hash, handling legacy mappings
 */
export function getTabFromHash(hash: string): TabName {
  const tabName = hash.slice(1); // Remove #

  // Check legacy mapping first
  if (tabName in LEGACY_TAB_MAP) {
    return LEGACY_TAB_MAP[tabName];
  }

  // Return valid tab or default
  return isValidTab(tabName) ? tabName : DEFAULT_TAB;
}
