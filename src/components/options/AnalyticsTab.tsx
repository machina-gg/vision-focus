import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { Card, Button, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { trackedSiteKeys } from '~/lib/siteService';
import type { ActivityLog } from '~/types/activity';
import type { TrackedSite, TrackedSites } from '~/types/site';

import {
  AnalyticsExportBar,
  SiteRankingList,
  AnalyticsSummary,
  AnalyticsDateFilter
} from './analytics';

interface AnalyticsTabProps {
  activity: ActivityLog;
  trackedSites: TrackedSites;
  onReblock: (site: TrackedSite) => void;
  onReset: () => void;
  onStopTracking: (site: TrackedSite) => void;
  onRefresh: () => Promise<void>;
  onAddSite: (domain: string) => Promise<boolean>;
  addSiteError: string;
  isSupportPromptVisible: boolean;
  onSupport: () => Promise<void>;
  onDismissSupport: () => Promise<void>;
}

export function AnalyticsTab({
  activity,
  trackedSites,
  onReblock,
  onReset,
  onStopTracking,
  onRefresh,
  onAddSite,
  addSiteError,
  isSupportPromptVisible,
  onSupport,
  onDismissSupport
}: AnalyticsTabProps) {
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const sites = useMemo(() => trackedSiteKeys(trackedSites), [trackedSites]);

  const handleAddSite = async () => {
    const domain = newSiteDomain.trim().toLowerCase();
    if (!domain) return;
    if (await onAddSite(domain)) {
      setNewSiteDomain('');
    }
  };

  return (
    <div className="space-y-6">
      <AnalyticsExportBar
        activity={activity}
        trackedSites={trackedSites}
        onRefresh={onRefresh}
        onReset={onReset}
      />

      <SiteRankingList activity={activity} sites={sites} />

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
        {addSiteError && (
          <p
            className="mt-2 text-sm text-danger-600"
            data-testid="analytics-add-site-error"
          >
            {addSiteError}
          </p>
        )}
      </Card>

      <AnalyticsSummary
        activity={activity}
        trackedSites={trackedSites}
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
