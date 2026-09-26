/** 拡張機能の更新・再読み込み後に残った古いスクリプトでは false を返す */
export function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

export function openOptionsPage(): void {
  if (!isExtensionContextValid()) {
    return;
  }
  chrome.runtime.openOptionsPage();
}

export function createTab(url: string): void {
  chrome.tabs.create({ url });
}

export function getExtensionURL(path: string): string {
  if (!isExtensionContextValid()) {
    return '';
  }
  return chrome.runtime.getURL(path);
}

export function openExtensionPage(path: string): void {
  createTab(getExtensionURL(path));
}
