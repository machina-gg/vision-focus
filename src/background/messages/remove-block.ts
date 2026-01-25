import type { PlasmoMessaging } from '@plasmohq/messaging'

import { getSettings, setSettings } from '~/lib/storage'

import { updateBlockRules } from '../blocker'

export type RemoveBlockRequest = {
  id: string
}

export type RemoveBlockResponse = {
  success: boolean
}

const handler: PlasmoMessaging.MessageHandler<
  RemoveBlockRequest,
  RemoveBlockResponse
> = async (req, res) => {
  const { id } = req.body

  // Validate input
  if (!id || typeof id !== 'string' || id.length === 0 || id.length > 100) {
    res.send({ success: false })
    return
  }

  const settings = await getSettings()
  const originalLength = settings.blockList.length
  settings.blockList = settings.blockList.filter((item) => item.id !== id)

  // Only update if something was actually removed
  if (settings.blockList.length < originalLength) {
    await setSettings(settings)
    await updateBlockRules()
  }

  res.send({ success: true })
}

export default handler
