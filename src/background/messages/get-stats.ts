import type { PlasmoMessaging } from '@plasmohq/messaging'

import { getTodayStats } from '../tracker'
import type { GetStatsRequest, GetStatsResponse } from '~/types/messages'

export type { GetStatsRequest, GetStatsResponse }

const handler: PlasmoMessaging.MessageHandler<
  GetStatsRequest,
  GetStatsResponse
> = async (_req, res) => {
  const stats = await getTodayStats()
  res.send({
    wasteTime: stats.wasteTime,
    investTime: stats.investTime,
    blockCount: stats.blockCount,
  })
}

export default handler
