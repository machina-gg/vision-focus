import { getSettings } from '~/lib/storage';
import { BLOCKER_CONFIG } from '~/constants/limits';
import {
  getBlockState,
  getActiveBlockedDomains,
  type BlockReason
} from '~/lib/blockService';
import { isExtensionContextValid } from '~/lib/chromeApi';

// Re-export types for backwards compatibility
export type { BlockReason };

// Re-export functions from blockService for backwards compatibility
export { findBlockItemForDomain } from '~/lib/blockService';

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

  // Create new rules
  const addRules: chrome.declarativeNetRequest.Rule[] = domainsToBlock.map(
    (domain, index) => {
      // Handle wildcard domains
      const isWildcard = domain.startsWith('*.');
      const baseDomain = isWildcard ? domain.replace('*.', '') : domain;

      return {
        id: BLOCKER_CONFIG.RULE_ID_OFFSET + index,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            extensionPath: '/newtab.html'
          }
        },
        condition: {
          urlFilter: isWildcard ? `||${baseDomain}` : `||${domain}`,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
        }
      };
    }
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
      // Add reason to URL for newtab page to display appropriate message
      const redirectUrl = result.reason
        ? `${newtabUrl}?reason=${result.reason}`
        : newtabUrl;
      await chrome.tabs.update(tab.id, { url: redirectUrl });
    }
  }
}
