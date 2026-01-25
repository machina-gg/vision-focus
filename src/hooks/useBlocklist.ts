import { useCallback, useState } from 'react'
import { sendToBackground } from '@plasmohq/messaging'

import { parseDomainInput } from '~/lib/domain'
import { storage } from '~/lib/storage'
import { canAddToBlocklist } from '~/lib/license'
import type { AppSettings } from '~/types/storage'

interface UseBlocklistOptions {
  settings: AppSettings | undefined
  setSettings: (settings: AppSettings) => void
}

interface UseBlocklistReturn {
  newDomain: string
  setNewDomain: (value: string) => void
  blockError: string
  handleAddDomain: () => Promise<void>
  handleRemoveDomain: (id: string) => Promise<void>
}

export function useBlocklist({
  settings,
  setSettings,
}: UseBlocklistOptions): UseBlocklistReturn {
  const [newDomain, setNewDomain] = useState('')
  const [blockError, setBlockError] = useState('')

  const handleAddDomain = useCallback(async () => {
    if (!settings || !newDomain.trim()) return

    const limitCheck = await canAddToBlocklist(settings.blockList.length)
    if (!limitCheck.allowed) {
      setBlockError(limitCheck.reason || `Limit reached: ${limitCheck.limit} sites`)
      return
    }

    const parsed = parseDomainInput(newDomain)
    if (!parsed) {
      setBlockError('Invalid domain format')
      return
    }

    if (settings.blockList.some((item) => item.domain === parsed.domain)) {
      setBlockError('Domain already in block list')
      return
    }

    try {
      const response = await sendToBackground({
        name: 'add-block',
        body: { domain: newDomain.trim() },
      })

      if (response.success) {
        setNewDomain('')
        setBlockError('')
        const updatedSettings = await storage.get<AppSettings>('settings')
        if (updatedSettings) {
          setSettings(updatedSettings)
        }
      } else {
        setBlockError(response.error || 'Failed to add domain')
      }
    } catch {
      setBlockError('Failed to add domain')
    }
  }, [settings, newDomain, setSettings])

  const handleRemoveDomain = useCallback(async (id: string) => {
    try {
      await sendToBackground({ name: 'remove-block', body: { id } })
      const updatedSettings = await storage.get<AppSettings>('settings')
      if (updatedSettings) {
        setSettings(updatedSettings)
      }
    } catch (error) {
      console.error('Failed to remove domain:', error)
    }
  }, [setSettings])

  return {
    newDomain,
    setNewDomain,
    blockError,
    handleAddDomain,
    handleRemoveDomain,
  }
}
