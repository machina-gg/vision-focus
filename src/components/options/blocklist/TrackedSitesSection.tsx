import React from 'react';
import { Eye, Lock, Unlock } from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { UnblockHistory } from '~/types/storage';

interface TrackedSitesSectionProps {
  unblockHistory: UnblockHistory;
}

/**
 * 追跡中のサイト一覧を表示するセクション
 * ブロック状態（blocked/unblocked）を分かりやすく表示する
 */
export function TrackedSitesSection({
  unblockHistory
}: TrackedSitesSectionProps) {
  const trackedSites = Object.values(unblockHistory.sites);

  // ブロック状態でソート（blocked → unblocked の順）
  const sortedSites = trackedSites.sort((a, b) => {
    if (a.status === b.status) {
      // 同じ状態の場合は最新の活動順
      const aTime = a.lastActivity || a.blockedAt;
      const bTime = b.lastActivity || b.blockedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }
    return a.status === 'blocked' ? -1 : 1;
  });

  const blockedCount = trackedSites.filter((s) => s.status === 'blocked').length;
  const unblockedCount = trackedSites.filter(
    (s) => s.status === 'unblocked'
  ).length;

  if (trackedSites.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          {getMessage('trackedSites')}
        </h2>
        <div className="text-sm text-gray-500">
          {getMessage('trackedSitesCount', String(trackedSites.length))}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {getMessage('trackedSitesDescription')}
      </p>

      {/* サマリー */}
      <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-success-600" />
          <span className="text-sm font-medium text-gray-700">
            {getMessage('statusBlocked')}: {blockedCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Unlock className="w-4 h-4 text-block-500" />
          <span className="text-sm font-medium text-gray-700">
            {getMessage('statusUnblocked')}: {unblockedCount}
          </span>
        </div>
      </div>

      {/* 追跡サイトリスト */}
      <div className="space-y-2">
        {sortedSites.map((site) => (
          <div
            key={site.domain}
            className={`p-3 rounded-lg border ${
              site.status === 'blocked'
                ? 'bg-success-50 border-success-200'
                : 'bg-block-50 border-block-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {site.status === 'blocked' ? (
                  <Lock className="w-4 h-4 text-success-600 flex-shrink-0" />
                ) : (
                  <Unlock className="w-4 h-4 text-block-500 flex-shrink-0" />
                )}
                <span className="font-medium text-gray-900 truncate">
                  {site.domain}
                </span>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  site.status === 'blocked'
                    ? 'bg-success-100 text-success-700'
                    : 'bg-block-100 text-block-700'
                }`}
              >
                {site.status === 'blocked'
                  ? getMessage('statusBlocked')
                  : getMessage('statusUnblocked')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
