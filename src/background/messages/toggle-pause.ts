import type { PlasmoMessaging } from '@plasmohq/messaging'

import { updateBlockRules } from '~/background/blocker'
import { getSettings, setSettings } from '~/lib/storage'

export type RequestBody = {
  paused: boolean
}

export type ResponseBody = {
  success: boolean
  paused: boolean
}

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  const { paused } = req.body

  const settings = await getSettings()
  settings.paused = paused
  await setSettings(settings)

  // Update block rules based on new paused state
  await updateBlockRules()

  res.send({
    success: true,
    paused,
  })
}

export default handler
