// Background images for selection
export const BACKGROUND_OPTIONS = [
  { id: 'default-1', name: 'Sky1' },
  { id: 'default-2', name: 'Sky2' },
  { id: 'default-3', name: 'Mountain1' },
  { id: 'default-4', name: 'Mountain2' },
  { id: 'default-5', name: 'Ocean' },
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' }
] as const;

export type BackgroundOption = (typeof BACKGROUND_OPTIONS)[number];

// Helper to get background URL
export function getBackgroundUrl(bgId: string): string {
  return chrome.runtime.getURL(`assets/images/backgrounds/${bgId}.jpg`);
}
