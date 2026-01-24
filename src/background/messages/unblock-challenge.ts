import type { PlasmoMessaging } from '@plasmohq/messaging'

import { addTempUnblock, getSettings } from '~/lib/storage'
import { CHALLENGE_TEXT, TEMP_UNBLOCK_DURATION_MS } from '~/types/storage'

import { updateBlockRules } from '../blocker'

export type UnblockChallengeRequest = {
  domain: string
  input: string
}

export type UnblockChallengeResponse = {
  success: boolean
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<
  UnblockChallengeRequest,
  UnblockChallengeResponse
> = async (req, res) => {
  const { domain, input } = req.body
  const settings = await getSettings()

  // Check if challenge is enabled
  if (!settings.challengeEnabled) {
    // If challenge is disabled, just unblock
    await addTempUnblock(domain, TEMP_UNBLOCK_DURATION_MS)
    await updateBlockRules()
    res.send({ success: true })
    return
  }

  // Validate challenge input
  if (input.trim() !== CHALLENGE_TEXT) {
    res.send({ success: false, error: 'Challenge text does not match' })
    return
  }

  // Add temp unblock
  await addTempUnblock(domain, TEMP_UNBLOCK_DURATION_MS)
  await updateBlockRules()

  res.send({ success: true })
}

export default handler
