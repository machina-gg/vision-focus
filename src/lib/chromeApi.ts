/**
 * Chrome API wrapper for improved testability and maintainability.
 * UI components should use these wrappers instead of calling Chrome APIs directly.
 *
 * Note: background/ files and content scripts may still call Chrome APIs directly
 * since they use background-specific APIs or run in a different context.
 */

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
  chrome.runtime.openOptionsPage();
}

/** Create a new tab with the given URL */
export function createTab(url: string): void {
  chrome.tabs.create({ url });
}

/** Get the full URL for an extension resource */
export function getExtensionURL(path: string): string {
  return chrome.runtime.getURL(path);
}

/** Open an extension page in a new tab */
export function openExtensionPage(path: string): void {
  createTab(getExtensionURL(path));
}
