import { updateBlockRules } from '../blocker';

export function setupLifecycleHandlers(): void {
  chrome.runtime.onInstalled.addListener(async () => {
    await updateBlockRules();
  });

  chrome.runtime.onStartup.addListener(async () => {
    await updateBlockRules();
  });
}
