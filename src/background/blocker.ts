import { extractDomain, generateId } from '~/lib/domain';
import { getSettings } from '~/lib/storage';
import { isWithinSchedule } from '~/lib/time';
import { BLOCKER_CONFIG } from '~/constants/limits';
import type { AppSettings, BlockItem, Schedule } from '~/types/storage';
import { hasExceededTimeLimit, findBlockItemForDomain } from './time-limit';

// Check if any schedule is currently active
function isAnyScheduleActive(schedules: Schedule[]): boolean {
  if (schedules.length === 0) return true; // No schedules = always active
  return schedules.some(
    (schedule) =>
      schedule.enabled &&
      isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
  );
}

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

  // Get domains to block
  const domainsToBlock = getActiveBlockedDomains(settings.blockList, settings);

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

// Get list of domains that should be actively blocked (always-blocked sites only)
// Sites with time limits are handled dynamically, not via declarativeNetRequest
function getActiveBlockedDomains(
  blockList: BlockItem[],
  settings: AppSettings
): string[] {
  // If no schedule is active, don't block anything
  if (!isAnyScheduleActive(settings.schedules)) {
    return [];
  }

  // Only include always-blocked sites (no time limit)
  return blockList
    .filter((item) => item.enabled && !item.timeLimit)
    .map((item) => item.domain);
}

// Block reason type
export type BlockReason = 'always_blocked' | 'time_limit_exceeded' | null;

// Check if a specific URL should be blocked and return the reason
export async function shouldBlockUrl(
  url: string
): Promise<{ blocked: boolean; reason: BlockReason }> {
  const domain = extractDomain(url);
  if (!domain) return { blocked: false, reason: null };

  const settings = await getSettings();

  // If paused, don't block
  if (settings.paused) return { blocked: false, reason: null };

  // Check if domain is in block list and enabled
  const blockItem = await findBlockItemForDomain(domain);
  if (!blockItem) return { blocked: false, reason: null };

  // Check if any schedule is active
  if (!isAnyScheduleActive(settings.schedules)) {
    return { blocked: false, reason: null };
  }

  // Check if site has a time limit
  if (blockItem.timeLimit) {
    // Site has time limit - check if exceeded
    const exceeded = await hasExceededTimeLimit(domain);
    return {
      blocked: exceeded,
      reason: exceeded ? 'time_limit_exceeded' : null
    };
  }

  // No time limit - always blocked
  return { blocked: true, reason: 'always_blocked' };
}

// Legacy function for backward compatibility
export async function isUrlBlocked(url: string): Promise<boolean> {
  const result = await shouldBlockUrl(url);
  return result.blocked;
}

// Add domain to block list and update rules
export async function addBlockedDomain(
  domain: string,
  isWildcard: boolean
): Promise<boolean> {
  const settings = await getSettings();

  // Check free tier limit
  if (settings.blockList.length >= 5) {
    // TODO: Check premium status
    return false;
  }

  const newItem: BlockItem = {
    id: generateId(),
    domain: isWildcard ? `*.${domain.replace('*.', '')}` : domain,
    isWildcard,
    createdAt: new Date().toISOString(),
    enabled: true
  };

  settings.blockList.push(newItem);

  const { setSettings } = await import('~/lib/storage');
  await setSettings(settings);
  await updateBlockRules();

  return true;
}

// Remove domain from block list
export async function removeBlockedDomain(id: string): Promise<void> {
  const settings = await getSettings();
  settings.blockList = settings.blockList.filter((item) => item.id !== id);

  const { setSettings } = await import('~/lib/storage');
  await setSettings(settings);
  await updateBlockRules();
}

// Check all open tabs and redirect any that match blocked domains
export async function blockExistingTabs(): Promise<void> {
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
