import type { PlasmoMessaging } from '@plasmohq/messaging'

import { setSiteCategory } from '~/background/tracker'

interface SetSiteCategoryRequest {
  domain: string
  category: 'waste' | 'invest' | 'neutral'
}

// Simple domain format validation for category setting
function isValidDomainFormat(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false
  if (domain.length > 253) return false
  // Basic hostname pattern (allows subdomains)
  return /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(domain)
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { domain, category } = req.body as SetSiteCategoryRequest

  if (!domain || !category) {
    res.send({ success: false, error: 'Missing domain or category' })
    return
  }

  // Validate domain format
  if (!isValidDomainFormat(domain)) {
    res.send({ success: false, error: 'Invalid domain format' })
    return
  }

  if (!['waste', 'invest', 'neutral'].includes(category)) {
    res.send({ success: false, error: 'Invalid category' })
    return
  }

  try {
    await setSiteCategory(domain, category)
    res.send({ success: true })
  } catch (error) {
    console.error('Failed to set site category:', error)
    res.send({ success: false, error: 'Failed to set category' })
  }
}

export default handler
