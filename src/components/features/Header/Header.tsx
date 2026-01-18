import React from 'react'

import { Settings } from 'lucide-react'

export interface HeaderProps {
  showSettings?: boolean
  onSettingsClick?: () => void
}

export function Header({ showSettings = true, onSettingsClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">VF</span>
        </div>
        <span className="font-semibold text-gray-800">VisionFocus</span>
      </div>
      {showSettings && (
        <button
          onClick={onSettingsClick}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}
    </header>
  )
}
