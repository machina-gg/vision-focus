import {
  getAnalytics,
  setAnalytics,
  incrementSiteBlockCount,
  setLastBlockedDomain
} from '~/lib/storage';
import { extractDomain } from '~/lib/domain';
import { shouldTrackBlockForDomain } from '~/lib/blockService';

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

    // Increment block count for this domain
    await incrementSiteBlockCount(domain);

    // Store last blocked domain for newtab display
    await setLastBlockedDomain(domain);

    // Also increment daily stats block count
    const analytics = await getAnalytics();
    const today = new Date().toISOString().slice(0, 10);
    const todayStats = analytics.dailyStats[today] || {
      date: today,
      wasteTime: 0,
      investTime: 0,
      blockCount: 0,
      unblockCount: 0
    };

    await setAnalytics({
      ...analytics,
      dailyStats: {
        ...analytics.dailyStats,
        [today]: {
          ...todayStats,
          blockCount: todayStats.blockCount + 1
        }
      }
    });
  });
}
