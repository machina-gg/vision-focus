/**
 * Chrome API wrapper for improved testability and maintainability.
 * UI components should use these wrappers instead of calling Chrome APIs directly.
 *
 * Note: background/ files and content scripts may still call Chrome APIs directly
 * since they use background-specific APIs or run in a different context.
 */

/**
 * Check if extension context is still valid.
 * Returns false if the extension has been updated/reloaded and this script is stale.
 */
export function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

/** Get the currently active tab in the current window */
export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

/** Open the extension's options page */
export function openOptionsPage(): void {
  if (!isExtensionContextValid()) {
    return;
  }
  chrome.runtime.openOptionsPage();
}

/** Create a new tab with the given URL */
export function createTab(url: string): void {
  chrome.tabs.create({ url });
}

/** Get the full URL for an extension resource */
export function getExtensionURL(path: string): string {
  if (!isExtensionContextValid()) {
    // Return empty string if context is invalid
    return '';
  }
  return chrome.runtime.getURL(path);
}

/** Open an extension page in a new tab */
export function openExtensionPage(path: string): void {
  createTab(getExtensionURL(path));
}
