import type { PlasmoMessaging } from '@plasmohq/messaging'

import { getTodayStats } from '../tracker'
import { getAllSiteBlockCounts } from '~/lib/storage'
import type { GetStatsRequest, GetStatsResponse } from '~/types/messages'

export type { GetStatsRequest, GetStatsResponse }

const handler: PlasmoMessaging.MessageHandler<
  GetStatsRequest,
  GetStatsResponse
> = async (_req, res) => {
  const [stats, allBlockCounts] = await Promise.all([
    getTodayStats(),
    getAllSiteBlockCounts(),
  ])

  // Get the top blocked site (first one since it's sorted by count descending)
  const topBlockedSite =
    allBlockCounts.length > 0
      ? { domain: allBlockCounts[0].domain, count: allBlockCounts[0].count }
      : null

  res.send({
    wasteTime: stats.wasteTime,
    investTime: stats.investTime,
    blockCount: stats.blockCount,
    topBlockedSite,
  })
}

export default handler
