import type { MessageHandler } from '~/lib/messaging';
import { getTodayStats } from '../tracker';
import { getAllSiteBlockCounts } from '~/lib/storage';

export const getStatsHandler: MessageHandler<'get-stats'> = async () => {
  const [stats, allBlockCounts] = await Promise.all([
    getTodayStats(),
    getAllSiteBlockCounts()
  ]);

  // Get the top blocked site (first one since it's sorted by count descending)
  const topBlockedSite =
    allBlockCounts.length > 0
      ? { domain: allBlockCounts[0].domain, count: allBlockCounts[0].count }
      : null;

  return {
    wasteTime: stats.wasteTime,
    investTime: stats.investTime,
    blockCount: stats.blockCount,
    unblockCount: stats.unblockCount,
    topBlockedSite
  };
};
