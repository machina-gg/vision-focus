import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';

import { blockListSites } from '~/lib/blockList';
import { getMessage } from '~/lib/i18n';
import type { TrackedSites } from '~/types/site';

interface BlockedSitesListProps {
  trackedSites: TrackedSites;
  blockCounts: Record<string, number>;
  maxVisible?: number;
}

export function BlockedSitesList({
  trackedSites,
  blockCounts,
  maxVisible = 5
}: BlockedSitesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showsAll, setShowsAll] = useState(false);

  const enabledBlockList = blockListSites(trackedSites).filter(
    (site) => site.block.enabled
  );

  if (enabledBlockList.length === 0) {
    return null;
  }

  const visibleSites = showsAll
    ? enabledBlockList
    : enabledBlockList.slice(0, maxVisible);
  const hiddenCount = enabledBlockList.length - visibleSites.length;
  const hasMore = enabledBlockList.length > maxVisible;

  const handleToggleList = () => {
    if (isExpanded) {
      setShowsAll(false);
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <button
        data-testid="newtab-blocked-sites-toggle"
        aria-expanded={isExpanded}
        onClick={handleToggleList}
        className="w-full flex items-center justify-between px-5 py-3 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-danger-500/20 rounded-lg">
            <Shield className="w-4 h-4 text-danger-400" />
          </div>
          <span className="text-sm font-medium text-white/90">
            {getMessage('blockedSites')} ({enabledBlockList.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-white/60" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/60" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <ul className="divide-y divide-white/5">
            {visibleSites.map((item) => {
              const count = blockCounts[item.domain] ?? 0;
              return (
                <li
                  key={item.domain}
                  className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-danger-400 flex-shrink-0 shadow-[0_0_6px_rgba(248,113,113,0.5)]" />
                    <span
                      className="text-sm text-white/80 truncate font-medium"
                      data-testid="newtab-blocked-site-domain"
                    >
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

          {hasMore && (
            <button
              data-testid="newtab-blocked-sites-show-more"
              aria-expanded={showsAll}
              onClick={() => setShowsAll(!showsAll)}
              className="w-full px-5 py-2.5 text-xs font-medium text-white/60 hover:text-white/90 hover:bg-white/5 border-t border-white/5 transition-colors"
            >
              {showsAll
                ? getMessage('showLessBlockedSites')
                : getMessage('showMoreBlockedSites', hiddenCount.toString())}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
