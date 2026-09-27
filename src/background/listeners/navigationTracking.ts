import { extractDomain } from '~/lib/domain';
import { getBlockStateForDomain } from '~/lib/blockService';
import { recordBlockedDomain } from '~/lib/blockRecordService';

/** メインフレームの遷移を見て、ブロック対象のドメインへの遷移をブロックとして記録する */
export function setupNavigationTracking(): void {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    const url = details.url;
    const domain = extractDomain(url);
    if (!domain) return;

    const state = await getBlockStateForDomain(domain);
    if (!state.blocked) return;

    await recordBlockedDomain(domain, state.reason);
  });
}
