/**
 * 拡張機能の API を使えるか。拡張機能の更新・再読み込み後に残った古いスクリプトでは false を返す
 * @returns 拡張機能のコンテキストが有効なら true
 */
export function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

/**
 * 現在のウィンドウのアクティブなタブ（無ければ undefined）
 * @returns アクティブなタブ
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

/** 拡張機能の設定ページを開く（拡張機能のコンテキストが無効なら何もしない） */
export function openOptionsPage(): void {
  if (!isExtensionContextValid()) {
    return;
  }
  chrome.runtime.openOptionsPage();
}

/**
 * 新しいタブで URL を開く
 * @param url 開く URL
 */
export function createTab(url: string): void {
  chrome.tabs.create({ url });
}

/**
 * 拡張機能内のリソースの完全な URL（拡張機能のコンテキストが無効なら空文字）
 * @param path 拡張機能のルートからのパス
 * @returns chrome-extension:// から始まる URL
 */
export function getExtensionURL(path: string): string {
  if (!isExtensionContextValid()) {
    return '';
  }
  return chrome.runtime.getURL(path);
}

/**
 * 拡張機能内のページを新しいタブで開く
 * @param path 拡張機能のルートからのページのパス
 */
export function openExtensionPage(path: string): void {
  createTab(getExtensionURL(path));
}
