import React from 'react'
import { Ban, Clock, TrendingUp } from 'lucide-react'

import { getMessage } from '~/lib/i18n'
import { formatTime } from '~/lib/time'

interface MiniStatsProps {
  wasteTime: number
  investTime: number
  blockCount: number
}

export function MiniStats({ wasteTime, investTime, blockCount }: MiniStatsProps) {
  return (
    <div className="flex justify-center gap-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
        <div className="flex items-center justify-center gap-2 text-red-500 mb-1">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-medium">{getMessage('waste')}</span>
        </div>
        <p className="text-xl font-bold text-red-600">{formatTime(wasteTime)}</p>
      </div>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
        <div className="flex items-center justify-center gap-2 text-green-500 mb-1">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium">{getMessage('invest')}</span>
        </div>
        <p className="text-xl font-bold text-green-600">{formatTime(investTime)}</p>
      </div>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
        <div className="flex items-center justify-center gap-2 text-amber-500 mb-1">
          <Ban className="w-4 h-4" />
          <span className="text-xs font-medium">{getMessage('blocked')}</span>
        </div>
        <p className="text-xl font-bold text-amber-600">{blockCount}</p>
      </div>
    </div>
  )
}
