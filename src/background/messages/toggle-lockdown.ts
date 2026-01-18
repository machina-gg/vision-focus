import type { PlasmoMessaging } from '@plasmohq/messaging'

import { getSettings, setSettings } from '~/lib/storage'

import { updateBlockRules } from '../blocker'

export type ToggleLockdownRequest = {
  enabled: boolean
  durationMinutes?: number // Optional duration, if not provided lockdown is indefinite
}

export type ToggleLockdownResponse = {
  success: boolean
  lockdownMode: boolean
  lockdownEndTime: string | null
}

const handler: PlasmoMessaging.MessageHandler<
  ToggleLockdownRequest,
  ToggleLockdownResponse
> = async (req, res) => {
  const { enabled, durationMinutes } = req.body

  const settings = await getSettings()

  if (enabled) {
    settings.lockdownMode = true
    settings.lockdownEndTime = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      : null
  } else {
    settings.lockdownMode = false
    settings.lockdownEndTime = null
  }

  await setSettings(settings)
  await updateBlockRules()

  res.send({
    success: true,
    lockdownMode: settings.lockdownMode,
    lockdownEndTime: settings.lockdownEndTime,
  })
}

export default handler
