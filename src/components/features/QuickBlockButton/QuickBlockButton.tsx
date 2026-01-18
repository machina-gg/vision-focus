import React from 'react'

import { Shield } from 'lucide-react'

import { Button } from '~/components/ui'
import { getMessage } from '~/lib/i18n'

export interface QuickBlockButtonProps {
  currentDomain?: string
  onBlock: (domain: string) => void
  disabled?: boolean
}

export function QuickBlockButton({
  currentDomain,
  onBlock,
  disabled = false,
}: QuickBlockButtonProps) {
  const handleClick = () => {
    if (currentDomain) {
      onBlock(currentDomain)
    }
  }

  return (
    <Button
      variant="ghost"
      fullWidth
      disabled={disabled || !currentDomain}
      onClick={handleClick}
      className="border border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50"
    >
      <Shield className="w-4 h-4" />
      {currentDomain
        ? getMessage('blockThisSite', currentDomain)
        : getMessage('noSiteToBlock')}
    </Button>
  )
}
