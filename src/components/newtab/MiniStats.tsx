import React from 'react';
import { Ban, Calendar, TrendingUp } from 'lucide-react';

import { getMessage } from '~/lib/i18n';

interface MiniStatsProps {
  blockCount: number;
  blockingDays: number | null; // null if site is not in blocklist
  isPremium?: boolean;
  onAnalyticsClick?: () => void;
}

export function MiniStats({
  blockCount,
  blockingDays,
  isPremium = false,
  onAnalyticsClick
}: MiniStatsProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex justify-center gap-4">
        {/* Today's Blocks */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
          <div className="flex items-center justify-center gap-2 text-amber-500 mb-1">
            <Ban className="w-4 h-4" />
            <span className="text-xs font-medium">
              {getMessage('todayBlocks')}
            </span>
          </div>
          <p className="text-xl font-bold text-amber-600">{blockCount}</p>
        </div>

        {/* Blocking Days */}
        {blockingDays !== null && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
            <div className="flex items-center justify-center gap-2 text-blue-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">
                {getMessage('blockingDays')}
              </span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {getMessage('blockedForDays', blockingDays.toString())}
            </p>
          </div>
        )}
      </div>

      {/* Analytics Link (Premium only) */}
      {isPremium && onAnalyticsClick && (
        <button
          onClick={onAnalyticsClick}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          {getMessage('viewAnalytics')}
        </button>
      )}
    </div>
  );
}
