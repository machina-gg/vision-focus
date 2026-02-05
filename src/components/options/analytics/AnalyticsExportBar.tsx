import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Shield,
  Download,
  ChevronDown,
  RotateCw,
  Share2,
  Image,
  Trash2
} from 'lucide-react';

import { Card, Button, Modal } from '~/components/ui';
import { AnalyticsChart } from '~/components/features';
import {
  REFRESH_SPINNER_DELAY_MS,
  SHARE_MESSAGE_DELAY_MS
} from '~/constants/intervals';
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

interface AnalyticsExportBarProps {
  settings: AppSettings | null;
  analyticsData: AnalyticsData;
  unblockHistory: UnblockHistory;
  isPremium: boolean;
  hasUnblockedSites: boolean;
  onRefresh: () => Promise<void>;
  onReset: () => void;
}

export function AnalyticsExportBar({
  settings,
  analyticsData,
  unblockHistory,
  isPremium,
  hasUnblockedSites,
  onRefresh,
  onReset
}: AnalyticsExportBarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [shareMessage, setShareMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), REFRESH_SPINNER_DELAY_MS);
  };

  const hasBlockList = (settings?.blockList?.length ?? 0) > 0;
  const hasBlockCounts =
    Object.keys(analyticsData.siteBlockCounts || {}).length > 0;
  const hasDailyStats = Object.keys(analyticsData.dailyStats || {}).length > 0;
  const hasUnblockedData = Object.keys(unblockHistory.sites || {}).length > 0;
  const hasAnyData =
    hasBlockList || hasBlockCounts || hasDailyStats || hasUnblockedData;

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

  const topBlockedSites = useMemo(() => {
    const counts = Object.values(analyticsData.siteBlockCounts || {});
    return counts.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [analyticsData.siteBlockCounts]);

  const handleShareToX = useCallback(async () => {
    if (!chartRef.current) return;

    try {
      const canvas = await captureElementAsCanvas(chartRef.current);
      if (!canvas) {
        setShareMessage({ type: 'error', text: getMessage('shareError') });
        return;
      }

      const success = await copyImageToClipboard(canvas);
      if (!success) {
        setShareMessage({ type: 'error', text: getMessage('shareError') });
        return;
      }

      const text = generateShareText({
        totalBlockCount,
        totalWasteTime,
        totalInvestTime,
        topBlockedSite: topBlockedSites[0]?.domain
      });

      setShareMessage({ type: 'success', text: getMessage('shareSuccess') });

      shareToX(text);

      setTimeout(() => setShareMessage(null), SHARE_MESSAGE_DELAY_MS);
    } catch {
      setShareMessage({ type: 'error', text: getMessage('shareError') });
    }
  }, [totalBlockCount, totalWasteTime, totalInvestTime, topBlockedSites]);

  const handleDownloadImage = useCallback(async () => {
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
  }, []);

  const handleReset = () => {
    onReset();
    setShowResetModal(false);
  };

  return (
    <>
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

      {/* Analytics Chart (Premium only) */}
      {hasUnblockedSites && isPremium && (
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
    </>
  );
}
