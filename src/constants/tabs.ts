/**
 * Settings page tab names
 */
export const TABS = {
  BLOCKLIST: 'blocklist',
  STYLES: 'styles',
  SCHEDULES: 'schedules',
  ANALYTICS: 'analytics',
  LICENSE: 'license',
  HELP: 'help'
} as const;

/**
 * Type for tab names
 */
export type TabName = (typeof TABS)[keyof typeof TABS];

/**
 * Tab order for UI rendering
 */
export const TAB_ORDER: TabName[] = [
  TABS.BLOCKLIST,
  TABS.STYLES,
  TABS.SCHEDULES,
  TABS.ANALYTICS,
  TABS.LICENSE,
  TABS.HELP
];

/**
 * Default tab when no valid tab is specified
 */
export const DEFAULT_TAB: TabName = TABS.BLOCKLIST;

/**
 * Legacy tab mapping (for backward compatibility)
 */
export const LEGACY_TAB_MAP: Partial<Record<string, TabName>> = {
  general: TABS.STYLES
} as const;

/**
 * Check if a string is a valid tab name
 */
export function isValidTab(tab: string): tab is TabName {
  return Object.values(TABS).includes(tab as TabName);
}

/**
 * Get the tab name from URL hash, handling legacy mappings
 */
export function getTabFromHash(hash: string): TabName {
  const tabName = hash.slice(1); // Remove #

  // Check legacy mapping first
  if (tabName in LEGACY_TAB_MAP) {
    return LEGACY_TAB_MAP[tabName] as TabName;
  }

  // Return valid tab or default
  return isValidTab(tabName) ? tabName : DEFAULT_TAB;
}
