/** 拡張機能の更新・再読み込み後に残った古いスクリプトでは false を返す */
export function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

/** 現在のウィンドウのアクティブなタブ（無ければ undefined） */
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

/** 拡張機能内のリソースの完全な URL（拡張機能のコンテキストが無効なら空文字） */
export function getExtensionURL(path: string): string {
  if (!isExtensionContextValid()) {
    return '';
  }
  return chrome.runtime.getURL(path);
}

export function openExtensionPage(path: string): void {
  createTab(getExtensionURL(path));
}
