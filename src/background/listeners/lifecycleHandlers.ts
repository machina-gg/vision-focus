import { updateBlockRules } from '../blocker';

/** 拡張のインストール・更新時とブラウザの起動時にブロックのルールを作り直す */
export function setupLifecycleHandlers(): void {
  chrome.runtime.onInstalled.addListener(async () => {
    await updateBlockRules();
  });

  chrome.runtime.onStartup.addListener(async () => {
    await updateBlockRules();
  });
}
