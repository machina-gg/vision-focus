import type { PlasmoMessaging } from '@plasmohq/messaging'

import { setSiteCategory } from '~/background/tracker'

interface SetSiteCategoryRequest {
  domain: string
  category: 'waste' | 'invest' | 'neutral'
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { domain, category } = req.body as SetSiteCategoryRequest

  if (!domain || !category) {
    res.send({ success: false, error: 'Missing domain or category' })
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
