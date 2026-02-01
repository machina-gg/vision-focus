import React, { useState, useEffect } from 'react'

import { Shield } from 'lucide-react'

import { Button, Input } from '~/components/ui'
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
  const [inputValue, setInputValue] = useState('')

  // Auto-fill with current domain when it changes
  useEffect(() => {
    if (currentDomain) {
      setInputValue(currentDomain)
    }
  }, [currentDomain])

  const handleBlock = () => {
    const domain = inputValue.trim()
    if (domain) {
      onBlock(domain)
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlock()
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">
        {getMessage('blockWebsites')}
      </h2>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={setInputValue}
          onKeyDown={handleKeyDown}
          placeholder={getMessage('domainPlaceholder')}
          containerClassName="flex-1 min-w-0"
          className="text-base py-2.5"
          disabled={disabled}
        />
        <Button
          onClick={handleBlock}
          disabled={disabled || !inputValue.trim()}
          className="shrink-0 px-4 py-2.5"
        >
          <Shield className="w-4 h-4" />
          {getMessage('block')}
        </Button>
      </div>
    </div>
  )
}
