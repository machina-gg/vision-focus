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

  const settings = await getSettings()
  settings.blockList = settings.blockList.filter((item) => item.id !== id)

  await setSettings(settings)
  await updateBlockRules()

  res.send({ success: true })
}

export default handler
