import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import { Card, Button, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { useSettings } from '~/contexts/SettingsContext';
import type { UnblockHistory, AnalyticsData } from '~/types/storage';

import {
  AnalyticsExportBar,
  SiteRankingList,
  AnalyticsSummary,
  AnalyticsDateFilter
} from './analytics';

interface AnalyticsTabProps {
  unblockHistory: UnblockHistory;
  analyticsData: AnalyticsData;
  onReblock: (domain: string) => void;
  onReset: () => void;
  onStopTracking: (domain: string) => void;
  onRefresh: () => Promise<void>;
  onAddSite: (domain: string) => void;
}

export function AnalyticsTab({
  unblockHistory,
  analyticsData,
  onReblock,
  onReset,
  onStopTracking,
  onRefresh,
  onAddSite
}: AnalyticsTabProps) {
  const { settings } = useSettings();
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
        settings={settings}
        analyticsData={analyticsData}
        unblockHistory={unblockHistory}
        onRefresh={onRefresh}
        onReset={onReset}
      />

      <SiteRankingList analyticsData={analyticsData} />

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
        unblockHistory={unblockHistory}
        onReblock={onReblock}
        onStopTracking={onStopTracking}
      />

      <AnalyticsDateFilter analyticsData={analyticsData} />
    </div>
  );
}
