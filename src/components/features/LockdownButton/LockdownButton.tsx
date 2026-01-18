import React from 'react'

import { Lock, Unlock } from 'lucide-react'

import { Button } from '~/components/ui'
import { getMessage } from '~/lib/i18n'

export interface LockdownButtonProps {
  isActive: boolean
  onToggle: (active: boolean) => void
  disabled?: boolean
}

export function LockdownButton({
  isActive,
  onToggle,
  disabled = false,
}: LockdownButtonProps) {
  return (
    <Button
      variant={isActive ? 'danger' : 'secondary'}
      fullWidth
      disabled={disabled}
      onClick={() => onToggle(!isActive)}
      className={isActive ? 'animate-pulse' : ''}
    >
      {isActive ? (
        <>
          <Lock className="w-4 h-4" />
          {getMessage('lockdownActive')}
        </>
      ) : (
        <>
          <Unlock className="w-4 h-4" />
          {getMessage('enableLockdownMode')}
        </>
      )}
    </Button>
  )
}
