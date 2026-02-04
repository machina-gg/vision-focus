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

  // Filter to only show enabled blocked sites
  const enabledBlockList = blockList.filter((item) => item.enabled !== false);

  if (enabledBlockList.length === 0) {
    return null;
  }

  const visibleSites = isExpanded
    ? enabledBlockList
    : enabledBlockList.slice(0, maxVisible);
  const hasMore = enabledBlockList.length > maxVisible;

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-red-500/20 rounded-lg">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-sm font-medium text-white/90">
            {getMessage('blockedSites')} ({enabledBlockList.length})
          </span>
        </div>
        {hasMore &&
          (isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/60" />
          ))}
      </button>

      {isExpanded && (
        <div className="mt-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <ul className="divide-y divide-white/5">
            {visibleSites.map((item) => {
              const count = blockCounts[item.domain]?.count ?? 0;
              return (
                <li
                  key={item.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 shadow-[0_0_6px_rgba(248,113,113,0.5)]" />
                    <span className="text-sm text-white/80 truncate font-medium">
                      {item.domain}
                    </span>
                  </div>
                  {count > 0 && (
                    <span className="text-xs text-white/50 flex-shrink-0 ml-3 bg-white/10 px-2 py-0.5 rounded-full">
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
