import { getSettings } from '~/lib/storage';
import { BLOCKER_CONFIG } from '~/constants/limits';
import {
  getBlockState,
  getActiveBlockedDomains,
  type BlockReason
} from '~/lib/blockService';
import { isExtensionContextValid } from '~/lib/chromeApi';
import { extractDomain } from '~/lib/domain';
import { recordBlockedDomain } from '~/lib/blockRecordService';

// Re-export types for backwards compatibility
export type { BlockReason };

// Update declarativeNetRequest rules based on current settings
export async function updateBlockRules(): Promise<void> {
  const settings = await getSettings();

  // If paused, don't block anything
  if (settings.paused) {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: []
    });
    return;
  }

  // Get domains to block (using centralized service)
  const domainsToBlock = await getActiveBlockedDomains();

  // Remove all existing rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((rule) => rule.id);

  // サイトキーは `*.` / `www.` を除いて正規化済みなので、そのまま `||キー` にする
  // （本体とすべてのサブドメインを止める。判定の `resolveSiteKey` と同じ範囲）
  const addRules: chrome.declarativeNetRequest.Rule[] = domainsToBlock.map(
    (domain, index) => ({
      id: BLOCKER_CONFIG.RULE_ID_OFFSET + index,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          extensionPath: '/newtab.html'
        }
      },
      condition: {
        urlFilter: `||${domain}`,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
      }
    })
  );

  // Update rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

// Check if a specific URL should be blocked and return the reason
// Using centralized BlockService
export async function shouldBlockUrl(
  url: string
): Promise<{ blocked: boolean; reason: BlockReason }> {
  const state = await getBlockState(url);
  return {
    blocked: state.blocked,
    reason: state.reason
  };
}

// Check all open tabs and redirect any that match blocked domains
export async function blockExistingTabs(): Promise<void> {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    return;
  }

  const tabs = await chrome.tabs.query({});
  const newtabUrl = chrome.runtime.getURL('newtab.html');

  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    // Skip extension pages and chrome:// pages
    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://')
    )
      continue;

    const result = await shouldBlockUrl(tab.url);
    if (result.blocked) {
      // リダイレクトすると元ドメインの webNavigation イベントが発生せず
      // navigationTracking の記録が走らないため、ここで記録する（#351）。
      // 順序が重要: 先に記録しないと、ブロック画面が読み出す時点で
      // 「最後にブロックしたドメイン」が未設定になりうる
      const domain = extractDomain(tab.url);
      if (domain) {
        await recordBlockedDomain(domain);
      }

      // Add reason to URL for newtab page to display appropriate message
      const redirectUrl = result.reason
        ? `${newtabUrl}?reason=${result.reason}`
        : newtabUrl;
      await chrome.tabs.update(tab.id, { url: redirectUrl });
    }
  }
}
