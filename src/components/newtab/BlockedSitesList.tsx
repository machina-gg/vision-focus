import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';

import { getMessage } from '~/lib/i18n';
import type { BlockItem, SiteBlockCount } from '~/types/storage';

interface BlockedSitesListProps {
  blockList: BlockItem[];
  blockCounts: Record<string, SiteBlockCount>;
  maxVisible?: number;
}

export function BlockedSitesList({
  blockList,
  blockCounts,
  maxVisible = 5
}: BlockedSitesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (blockList.length === 0) {
    return null;
  }

  const visibleSites = isExpanded ? blockList : blockList.slice(0, maxVisible);
  const hasMore = blockList.length > maxVisible;

  return (
    <div className="w-full max-w-sm mx-auto mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white/30 hover:bg-white/40 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-800">
            {getMessage('blockedSites')} ({blockList.length})
          </span>
        </div>
        {hasMore &&
          (isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ))}
      </button>

      {isExpanded && (
        <div className="mt-2 bg-white/25 rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-300/30">
            {visibleSites.map((item) => {
              const count = blockCounts[item.domain]?.count ?? 0;
              return (
                <li
                  key={item.id}
                  className="px-4 py-2 text-sm text-gray-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="truncate">{item.domain}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {getMessage('blockedTimesShort', count.toString())}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
