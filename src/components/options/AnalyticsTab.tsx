import React, { useMemo, useState, useRef } from 'react';
import {
  AlertTriangle,
  Clock,
  Lock,
  RefreshCw,
  Trash2,
  EyeOff,
  RotateCw,
  Plus,
  Shield,
  Download,
  ChevronDown,
  Share2,
  Image
} from 'lucide-react';

import { Card, Button, Modal, Input } from '~/components/ui';
import { UpgradePrompt, AnalyticsChart } from '~/components/features';
import { formatTime } from '~/lib/time';
import { getMessage } from '~/lib/i18n';
import {
  exportBlockList,
  exportBlockCounts,
  exportDailyStats,
  exportUnblockedSites
} from '~/lib/export';
import {
  shareToX,
  generateShareText,
  captureElementAsCanvas,
  copyImageToClipboard,
  downloadImage
} from '~/lib/share';
import type {
  UnblockHistory,
  AnalyticsData,
  AppSettings
} from '~/types/storage';

interface AnalyticsTabProps {
  unblockHistory: UnblockHistory;
  analyticsData: AnalyticsData;
  settings: AppSettings | null;
  isPremium: boolean;
  onReblock: (domain: string) => void;
  onReset: () => void;
  onStopTracking: (domain: string) => void;
  onRefresh: () => Promise<void>;
  onAddSite: (domain: string) => void;
}

// Format relative time (e.g., "3 days ago")
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return getMessage('today');
  } else if (diffDays === 1) {
    return getMessage('yesterday');
  } else if (diffDays < 7) {
    return getMessage('daysAgo', String(diffDays));
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return getMessage('weeksAgo', String(weeks));
  } else {
    const months = Math.floor(diffDays / 30);
    return getMessage('monthsAgo', String(months));
  }
}

export function AnalyticsTab({
  unblockHistory,
  analyticsData,
  settings,
  isPremium,
  onReblock,
  onReset,
  onStopTracking,
  onRefresh,
  onAddSite
}: AnalyticsTabProps) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [shareMessage, setShareMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleAddSite = () => {
    if (newSiteDomain.trim()) {
      onAddSite(newSiteDomain.trim().toLowerCase());
      setNewSiteDomain('');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    // Keep spinning for a moment so user can see it
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Separate and sort tracked sites by status
  const { blockedSites, unblockedSites } = useMemo(() => {
    const allSites = Object.values(unblockHistory.sites);
    const blocked = allSites
      .filter((s) => s.status === 'blocked')
      .sort(
        (a, b) =>
          new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime()
      );
    const unblocked = allSites
      .filter((s) => s.status === 'unblocked')
      .sort((a, b) => b.timeAfterUnblock - a.timeAfterUnblock);
    return { blockedSites: blocked, unblockedSites: unblocked };
  }, [unblockHistory.sites]);

  const hasTrackedSites = blockedSites.length > 0 || unblockedSites.length > 0;

  // Calculate total time spent on unblocked sites
  const totalTimeSpent = useMemo(() => {
    return unblockedSites.reduce((sum, site) => sum + site.timeAfterUnblock, 0);
  }, [unblockedSites]);

  // Sort site block counts (descending by count)
  const topBlockedSites = useMemo(() => {
    const counts = Object.values(analyticsData.siteBlockCounts || {});
    return counts.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [analyticsData.siteBlockCounts]);

  const handleReset = () => {
    onReset();
    setShowResetModal(false);
  };

  // Check if there's any data to export
  const hasBlockList = (settings?.blockList?.length ?? 0) > 0;
  const hasBlockCounts =
    Object.keys(analyticsData.siteBlockCounts || {}).length > 0;
  const hasDailyStats = Object.keys(analyticsData.dailyStats || {}).length > 0;
  const hasUnblockedData = Object.keys(unblockHistory.sites || {}).length > 0;
  const hasAnyData =
    hasBlockList || hasBlockCounts || hasDailyStats || hasUnblockedData;

  // Export handlers
  const handleExportBlockList = () => {
    if (settings?.blockList) {
      exportBlockList(settings.blockList);
    }
    setShowExportMenu(false);
  };

  const handleExportBlockCounts = () => {
    if (analyticsData.siteBlockCounts) {
      exportBlockCounts(analyticsData.siteBlockCounts);
    }
    setShowExportMenu(false);
  };

  const handleExportDailyStats = () => {
    if (analyticsData.dailyStats) {
      exportDailyStats(analyticsData.dailyStats);
    }
    setShowExportMenu(false);
  };

  const handleExportUnblockedSites = () => {
    if (isPremium) {
      exportUnblockedSites(unblockHistory);
    }
    setShowExportMenu(false);
  };

  // Calculate total stats for sharing
  const totalBlockCount = useMemo(() => {
    return Object.values(analyticsData.siteBlockCounts || {}).reduce(
      (sum, site) => sum + site.count,
      0
    );
  }, [analyticsData.siteBlockCounts]);

  const totalWasteTime = useMemo(() => {
    return Object.values(analyticsData.dailyStats || {}).reduce(
      (sum, stat) => sum + stat.wasteTime,
      0
    );
  }, [analyticsData.dailyStats]);

  const totalInvestTime = useMemo(() => {
    return Object.values(analyticsData.dailyStats || {}).reduce(
      (sum, stat) => sum + stat.investTime,
      0
    );
  }, [analyticsData.dailyStats]);

  const handleShareToX = async () => {
    if (!chartRef.current) return;

    try {
      // Capture the chart as canvas
      const canvas = await captureElementAsCanvas(chartRef.current);
      if (!canvas) {
        setShareMessage({ type: 'error', text: getMessage('shareError') });
        return;
      }

      // Copy to clipboard
      const success = await copyImageToClipboard(canvas);
      if (!success) {
        setShareMessage({ type: 'error', text: getMessage('shareError') });
        return;
      }

      // Generate share text
      const text = generateShareText({
        totalBlockCount,
        totalWasteTime,
        totalInvestTime,
        topBlockedSite: topBlockedSites[0]?.domain
      });

      // Show success message
      setShareMessage({ type: 'success', text: getMessage('shareSuccess') });

      // Open X intent
      shareToX(text);

      // Clear message after a delay
      setTimeout(() => setShareMessage(null), 5000);
    } catch {
      setShareMessage({ type: 'error', text: getMessage('shareError') });
    }
  };

  const handleDownloadImage = async () => {
    if (!chartRef.current) return;

    try {
      const canvas = await captureElementAsCanvas(chartRef.current);
      if (!canvas) {
        setShareMessage({ type: 'error', text: getMessage('shareError') });
        return;
      }

      const filename = `visionfocus-analytics-${new Date().toISOString().split('T')[0]}.png`;
      downloadImage(canvas, filename);
    } catch {
      setShareMessage({ type: 'error', text: getMessage('shareError') });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card with Export */}
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getMessage('trackedSitesTitle')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {getMessage('trackedSitesDescription')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={!hasAnyData}
                className="flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                {getMessage('exportData')}
                <ChevronDown className="w-3 h-3" />
              </Button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    <button
                      onClick={handleExportBlockList}
                      disabled={!hasBlockList}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {getMessage('exportBlockList')}
                    </button>
                    <button
                      onClick={handleExportBlockCounts}
                      disabled={!hasBlockCounts}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {getMessage('exportBlockCounts')}
                    </button>
                    <button
                      onClick={handleExportDailyStats}
                      disabled={!hasDailyStats}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {getMessage('exportDailyStats')}
                    </button>
                    {isPremium && (
                      <button
                        onClick={handleExportUnblockedSites}
                        disabled={!hasUnblockedData}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {getMessage('exportUnblockedSites')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-500 hover:text-gray-700"
              title={getMessage('refresh')}
            >
              <RotateCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </Card>

      {/* Top Blocked Sites */}
      {topBlockedSites.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {getMessage('topBlockedSites')}
            </h3>
          </div>
          <div className="space-y-2">
            {topBlockedSites.map((site, index) => (
              <div
                key={site.domain}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center text-sm font-medium text-gray-500 bg-gray-200 rounded-full">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">
                    {site.domain}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                  <Shield className="w-3.5 h-3.5" />
                  {getMessage('blockedTimesShort', site.count.toString())}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Site */}
      <Card>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {getMessage('addSiteToTrack')}
        </h3>
        <div className="flex gap-2">
          <Input
            value={newSiteDomain}
            onChange={(value) => setNewSiteDomain(value)}
            placeholder={getMessage('trackSitePlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
            className="flex-1"
          />
          <Button
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

      {/* Empty State */}
      {!hasTrackedSites && (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">&#10003;</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {getMessage('noUnblockedSites')}
            </h3>
            <p className="text-sm text-gray-500">
              {getMessage('noUnblockedSitesDescription')}
            </p>
          </div>
        </Card>
      )}

      {/* Blocked Sites List */}
      {blockedSites.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-600" />
            {getMessage('statusBlocked')} ({blockedSites.length})
          </h3>
          <div className="space-y-3">
            {blockedSites.map((site) => (
              <div
                key={site.domain}
                className="p-3 bg-green-50 rounded-lg border border-green-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="font-medium text-gray-900 truncate">
                        {site.domain}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        {getMessage('statusBlocked')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {getMessage('blockedSince')}:{' '}
                      {formatRelativeTime(site.blockedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">
                      0{getMessage('time') === 'Time' ? 'm' : '分'}
                    </span>
                    <p className="text-xs text-gray-500">
                      {getMessage('timeSaved')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Unblocked Sites List */}
      {unblockedSites.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            {getMessage('statusUnblocked')} ({unblockedSites.length})
          </h3>
          <div className="space-y-3">
            {unblockedSites.map((site) => (
              <div
                key={site.domain}
                className="p-4 bg-orange-50 rounded-lg border border-orange-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="font-medium text-gray-900 truncate">
                        {site.domain}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                        {getMessage('statusUnblocked')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                      {getMessage('unblockedOn')}:{' '}
                      {site.unblockedAt
                        ? formatRelativeTime(site.unblockedAt)
                        : '-'}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {isPremium ? (
                        <span className="text-sm font-medium text-orange-600">
                          {getMessage('timeSpentSinceUnblock')}:{' '}
                          {formatTime(site.timeAfterUnblock)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          {getMessage('timeSpentSinceUnblock')}:{' '}
                          <span className="tracking-widest">******</span>
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {isPremium && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onReblock(site.domain)}
                        className="flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {getMessage('reblock')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onStopTracking(site.domain)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
                    >
                      <EyeOff className="w-4 h-4" />
                      {getMessage('stopTracking')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Total time (Premium only) */}
            {isPremium && unblockedSites.length > 1 && (
              <div className="pt-4 border-t border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {getMessage('totalTimeOnUnblockedSites')}
                  </span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatTime(totalTimeSpent)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Upgrade Prompt for Free Users */}
      {unblockedSites.length > 0 && !isPremium && (
        <Card>
          <UpgradePrompt
            variant="inline"
            features={[
              getMessage('upgradeFeatureViewTime'),
              getMessage('upgradeFeatureReblock'),
              getMessage('upgradeFeatureChart')
            ]}
          />
        </Card>
      )}

      {/* Analytics Chart (Premium only) */}
      {unblockedSites.length > 0 && isPremium && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {getMessage('usageChart')}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShareToX}
                className="flex items-center gap-1.5"
                title={getMessage('shareToX')}
              >
                <Share2 className="w-4 h-4" />
                {getMessage('shareToX')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadImage}
                className="flex items-center gap-1.5"
                title={getMessage('downloadImage')}
              >
                <Image className="w-4 h-4" />
                {getMessage('downloadImage')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-1.5 text-gray-500 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
                {getMessage('reset')}
              </Button>
            </div>
          </div>
          {/* Share message */}
          {shareMessage && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                shareMessage.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {shareMessage.text}
            </div>
          )}
          <div ref={chartRef}>
            <AnalyticsChart
              analytics={analyticsData}
              unblockHistory={unblockHistory}
            />
          </div>
        </Card>
      )}

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title={getMessage('resetAnalyticsTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {getMessage('resetAnalyticsDescription')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowResetModal(false)}
            >
              {getMessage('cancel')}
            </Button>
            <Button variant="danger" onClick={handleReset}>
              {getMessage('reset')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
