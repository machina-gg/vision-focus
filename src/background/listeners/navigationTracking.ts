import { extractDomain } from '~/lib/domain';
import { shouldTrackBlockForDomain } from '~/lib/blockService';
import { recordBlockedDomain } from '~/lib/blockRecordService';

/**
 * ブロックされたナビゲーションを追跡し、サイトブロックカウントを増やす
 * 一元化された BlockService を使用して一貫性のある状態チェックを行う
 */
export function setupNavigationTracking(): void {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // Only track main frame navigations
    if (details.frameId !== 0) return;

    const url = details.url;
    const domain = extractDomain(url);
    if (!domain) return;

    // Use centralized service for block state validation
    // This ensures enabled flag, schedules, and paused state are all checked
    const shouldTrack = await shouldTrackBlockForDomain(domain);
    if (!shouldTrack) return;

    // 記録は blockExistingTabs 経由と共通（machina-gg/vision-focus#351）
    await recordBlockedDomain(domain);
  });
}
