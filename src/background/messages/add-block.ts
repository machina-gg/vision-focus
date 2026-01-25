import type { PlasmoMessaging } from '@plasmohq/messaging'

import { parseDomainInput, isValidDomain, generateId } from '~/lib/domain'
import { getSettings, setSettings } from '~/lib/storage'
import { canAddToBlocklist } from '~/lib/license'

import { updateBlockRules } from '../blocker'

export type AddBlockRequest = {
  domain: string
}

export type AddBlockResponse = {
  success: boolean
  error?: string
  limitReached?: boolean
}

const handler: PlasmoMessaging.MessageHandler<
  AddBlockRequest,
  AddBlockResponse
> = async (req, res) => {
  const { domain } = req.body

  if (!domain) {
    res.send({ success: false, error: 'Domain is required' })
    return
  }

  const settings = await getSettings()

  // Check tier limit using license service
  const limitCheck = await canAddToBlocklist(settings.blockList.length)
  if (!limitCheck.allowed) {
    res.send({
      success: false,
      error: limitCheck.reason || `Limit reached (${limitCheck.limit} sites)`,
      limitReached: true,
    })
    return
  }

  const { domain: parsedDomain, isWildcard } = parseDomainInput(domain)

  // Validate domain format
  if (!isValidDomain(parsedDomain)) {
    res.send({ success: false, error: 'Invalid domain format' })
    return
  }

  // Check if already in list
  const exists = settings.blockList.some(
    (item) => item.domain.toLowerCase() === parsedDomain.toLowerCase()
  )
  if (exists) {
    res.send({ success: false, error: 'Domain already in block list' })
    return
  }

  // Add to block list
  settings.blockList.push({
    id: generateId(),
    domain: parsedDomain,
    isWildcard,
    createdAt: new Date().toISOString(),
  })

  await setSettings(settings)
  await updateBlockRules()

  res.send({ success: true })
}

export default handler
