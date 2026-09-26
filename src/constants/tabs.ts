export const TABS = {
  BLOCKLIST: 'blocklist',
  STYLES: 'styles',
  SCHEDULES: 'schedules',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  HELP: 'help'
} as const;

export type TabName = (typeof TABS)[keyof typeof TABS];

export const TAB_ORDER: TabName[] = [
  TABS.BLOCKLIST,
  TABS.STYLES,
  TABS.SCHEDULES,
  TABS.ANALYTICS,
  TABS.SETTINGS,
  TABS.HELP
];

export const DEFAULT_TAB: TabName = TABS.BLOCKLIST;

export function isValidTab(tab: string): tab is TabName {
  return Object.values(TABS).includes(tab as TabName);
}

export function getTabFromHash(hash: string): TabName {
  const tabName = hash.slice(1);
  return isValidTab(tabName) ? tabName : DEFAULT_TAB;
}
