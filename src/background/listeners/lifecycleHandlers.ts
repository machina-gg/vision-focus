import { updateBlockRules } from '../blocker';
import { startTracking } from '../tracker';

/**
 * 拡張機能のインストール時にブロックルールとトラッキングを初期化する
 */
export function setupLifecycleHandlers(): void {
  // Initialize extension on install
  chrome.runtime.onInstalled.addListener(async () => {
    // Initialize block rules
    await updateBlockRules();

    // Start tracking
    startTracking();
  });

  // Handle extension startup
  chrome.runtime.onStartup.addListener(async () => {
    // Update block rules
    await updateBlockRules();

    // Start tracking
    startTracking();
  });
}
