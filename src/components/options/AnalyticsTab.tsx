import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import { Card, Button, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { ActivityLog } from '~/types/activity';
import type { SiteKey } from '~/types/site';
import type { BlockListRow, TrackedSiteListRow } from '~/lib/siteSelectors';

import {
  AnalyticsExportBar,
  SiteRankingList,
  AnalyticsSummary,
  AnalyticsDateFilter
} from './analytics';

interface AnalyticsTabProps {
  /** 事実の表。タブ内の数値はすべてここから導出する */
  activity: ActivityLog;
  /** 母集団（追跡中のサイト）。タブ内のどの数値もこの集合だけを数える */
  sites: readonly SiteKey[];
  /** ブロックリスト（CSV の出力元） */
  blockRows: BlockListRow[];
  /** 追跡中サイト一覧のブロック状態・ブロック開始日・できる操作 */
  trackedSiteRows: TrackedSiteListRow[];
  onReblock: (domain: string) => void;
  onReset: () => void;
  onStopTracking: (domain: string) => void;
  onRefresh: () => Promise<void>;
  onAddSite: (domain: string) => void;
  /** 支援誘導を出すか */
  isSupportPromptVisible: boolean;
  /** 支援ページを開く */
  onSupport: () => Promise<void>;
  /** 支援誘導を閉じる */
  onDismissSupport: () => Promise<void>;
}

export function AnalyticsTab({
  activity,
  sites,
  blockRows,
  trackedSiteRows,
  onReblock,
  onReset,
  onStopTracking,
  onRefresh,
  onAddSite,
  isSupportPromptVisible,
  onSupport,
  onDismissSupport
}: AnalyticsTabProps) {
  const [newSiteDomain, setNewSiteDomain] = useState('');

  const handleAddSite = () => {
    if (newSiteDomain.trim()) {
      onAddSite(newSiteDomain.trim().toLowerCase());
      setNewSiteDomain('');
    }
  };

  return (
    <div className="space-y-6">
      <AnalyticsExportBar
        blockRows={blockRows}
        activity={activity}
        sites={sites}
        onRefresh={onRefresh}
        onReset={onReset}
      />

      <SiteRankingList activity={activity} sites={sites} />

      {/* Add Site */}
      <Card>
        <h3
          className="text-sm font-medium text-gray-700 mb-3"
          data-testid="analytics-add-site-heading"
        >
          {getMessage('addSiteToTrack')}
        </h3>
        <div className="flex gap-2">
          <Input
            data-testid="analytics-add-site-input"
            value={newSiteDomain}
            onChange={(value) => setNewSiteDomain(value)}
            placeholder={getMessage('trackSitePlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
            className="flex-1"
          />
          <Button
            data-testid="analytics-add-site-button"
            variant="primary"
            onClick={handleAddSite}
            disabled={!newSiteDomain.trim()}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {getMessage('add')}
          </Button>
        </div>
      </Card>

      <AnalyticsSummary
        activity={activity}
        sites={sites}
        trackedSiteRows={trackedSiteRows}
        onReblock={onReblock}
        onStopTracking={onStopTracking}
      />

      <AnalyticsDateFilter
        activity={activity}
        sites={sites}
        isSupportPromptVisible={isSupportPromptVisible}
        onSupport={onSupport}
        onDismissSupport={onDismissSupport}
      />
    </div>
  );
}
