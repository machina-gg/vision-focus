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

export type { BlockReason };

export async function updateBlockRules(): Promise<void> {
  const settings = await getSettings();

  if (settings.paused) {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: []
    });
    return;
  }

  const domainsToBlock = await getActiveBlockedDomains();

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((rule) => rule.id);

  // `||キー` は本体とすべてのサブドメインに一致する（判定の `resolveSiteKey` と同じ範囲）
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

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

export async function shouldBlockUrl(
  url: string
): Promise<{ blocked: boolean; reason: BlockReason }> {
  const state = await getBlockState(url);
  return {
    blocked: state.blocked,
    reason: state.reason
  };
}

export async function blockExistingTabs(): Promise<void> {
  if (!isExtensionContextValid()) {
    return;
  }

  const tabs = await chrome.tabs.query({});
  const newtabUrl = chrome.runtime.getURL('newtab.html');

  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://')
    )
      continue;

    const result = await shouldBlockUrl(tab.url);
    if (result.blocked) {
      // リダイレクトでは元ドメインの webNavigation が発火せず記録されないので、ここで記録する。
      // リダイレクトより先に記録しないと、ブロック画面が「最後にブロックしたドメイン」を読めない
      const domain = extractDomain(tab.url);
      if (domain) {
        await recordBlockedDomain(domain);
      }

      const redirectUrl = result.reason
        ? `${newtabUrl}?reason=${result.reason}`
        : newtabUrl;
      await chrome.tabs.update(tab.id, { url: redirectUrl });
    }
  }
}
