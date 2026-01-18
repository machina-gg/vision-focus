import type { PlasmoMessaging } from '@plasmohq/messaging'

import { getTodayStats } from '../tracker'

export type GetStatsRequest = Record<string, never>

export type GetStatsResponse = {
  wasteTime: number
  investTime: number
  blockCount: number
}

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
