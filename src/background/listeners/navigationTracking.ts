import { extractDomain } from '~/lib/domain';
import { shouldTrackBlockForDomain } from '~/lib/blockService';
import { recordBlockedDomain } from '~/lib/blockRecordService';

/** メインフレームの遷移を見て、ブロック対象のドメインへの遷移をブロックとして記録する */
export function setupNavigationTracking(): void {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    const url = details.url;
    const domain = extractDomain(url);
    if (!domain) return;

    const shouldTrack = await shouldTrackBlockForDomain(domain);
    if (!shouldTrack) return;

    await recordBlockedDomain(domain);
  });
}
