import { BLOCKER_CONFIG } from '~/constants/limits';
import {
  getBlockState,
  getRuleTargets,
  type BlockReason
} from '~/lib/blockService';
import { isExtensionContextValid } from '~/lib/chromeApi';
import { extractDomain } from '~/lib/domain';
import { recordBlockedDomain } from '~/lib/blockRecordService';

/** ブロックした理由（常時ブロック / 時間制限の超過。ブロックしていなければ null） */
export type { BlockReason };

type RuleWithoutId = Omit<chrome.declarativeNetRequest.Rule, 'id'>;

const REDIRECT_PRIORITY = 1;
// 許可サイトは覆うブロックの転送より必ず優先させる
const ALLOW_PRIORITY = 2;

function conditionFor(
  domain: string
): chrome.declarativeNetRequest.RuleCondition {
  return {
    requestDomains: [domain],
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
  };
}

/** 現在の設定から declarativeNetRequest の動的ルールを作り直す（ブロック中の登録は転送、許可サイトは通す） */
export async function updateBlockRules(): Promise<void> {
  const { redirect, allow } = await getRuleTargets();

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((rule) => rule.id);

  // requestDomains はキーとそのサブドメインだけに一致する（判定の coveringSiteKeys と同じ範囲）
  const redirectRules = redirect.map((domain): RuleWithoutId => ({
    priority: REDIRECT_PRIORITY,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        extensionPath: '/newtab.html'
      }
    },
    condition: conditionFor(domain)
  }));
  const allowRules = allow.map((domain): RuleWithoutId => ({
    priority: ALLOW_PRIORITY,
    action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
    condition: conditionFor(domain)
  }));
  const addRules: chrome.declarativeNetRequest.Rule[] = [
    ...redirectRules,
    ...allowRules
  ].map((rule, index) => ({
    id: BLOCKER_CONFIG.RULE_ID_OFFSET + index,
    ...rule
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

/**
 * 今の動的ルールがブロック画面へ転送しているホストを返す
 * @returns 転送ルールの requestDomains（許可サイトのルールは含めない）
 */
export async function getRedirectedHosts(): Promise<string[]> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return rules
    .filter(
      (rule) =>
        rule.action.type ===
        chrome.declarativeNetRequest.RuleActionType.REDIRECT
    )
    .flatMap((rule) => rule.condition.requestDomains ?? []);
}

/** 開いているタブのうちブロック対象のものを、理由を記録してからブロック画面（newtab.html）へ移す（chrome:// と拡張のページは除く） */
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

    const state = await getBlockState(tab.url);
    if (state.blocked) {
      // リダイレクトでは元ドメインの webNavigation が発火せず記録されないので、ここで記録する。
      // リダイレクトより先に記録しないと、ブロック画面が「最後にブロックしたドメインと理由」を読めない
      const domain = extractDomain(tab.url);
      if (domain) {
        await recordBlockedDomain(domain, state.reason);
      }

      await chrome.tabs.update(tab.id, { url: newtabUrl });
    }
  }
}
