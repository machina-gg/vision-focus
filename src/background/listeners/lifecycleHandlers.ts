import { updateBlockRules } from '../blocker';

/**
 * 拡張機能のインストール時・ブラウザの起動時にブロックルールを作り直す
 */
export function setupLifecycleHandlers(): void {
  chrome.runtime.onInstalled.addListener(async () => {
    await updateBlockRules();
  });

  chrome.runtime.onStartup.addListener(async () => {
    await updateBlockRules();
  });
}
