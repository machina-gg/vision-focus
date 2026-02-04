import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart3
} from 'lucide-react';

import { Card, Button } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { formatTime } from '~/lib/time';
import { formatWeekRange, formatMonth } from '~/lib/report';
import type { WeeklyReport, MonthlyReport } from '~/types/report';

interface WeeklyReportCardProps {
  report: WeeklyReport | null;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

interface MonthlyReportCardProps {
  report: MonthlyReport | null;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

// Trend icon component
function TrendIcon({
  trend
}: {
  trend: 'improving' | 'declining' | 'stable';
}) {
  if (trend === 'improving') {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="w-4 h-4" />
        <span className="text-sm font-medium">{getMessage('improving')}</span>
      </div>
    );
  }
  if (trend === 'declining') {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="w-4 h-4" />
        <span className="text-sm font-medium">{getMessage('declining')}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-500">
      <Minus className="w-4 h-4" />
      <span className="text-sm font-medium">{getMessage('stable')}</span>
    </div>
  );
}

// Stats grid component
function StatsGrid({
  wasteTime,
  investTime,
  blockCount
}: {
  wasteTime: number;
  investTime: number;
  blockCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center p-3 bg-red-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
          <Clock className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-red-700">{formatTime(wasteTime)}</p>
        <p className="text-xs text-red-600">{getMessage('wasteTime')}</p>
      </div>
      <div className="text-center p-3 bg-green-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
          <Clock className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-green-700">
          {formatTime(investTime)}
        </p>
        <p className="text-xs text-green-600">{getMessage('investTime')}</p>
      </div>
      <div className="text-center p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
          <Shield className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-blue-700">{blockCount}</p>
        <p className="text-xs text-blue-600">{getMessage('blockedCount')}</p>
      </div>
    </div>
  );
}

// Top sites list component
function TopSitesList({
  sites,
  type
}: {
  sites: { domain: string; time: number }[];
  type: 'waste' | 'invest';
}) {
  if (sites.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-2">
        {getMessage('noData')}
      </p>
    );
  }

  const bgColor = type === 'waste' ? 'bg-red-50' : 'bg-green-50';
  const textColor = type === 'waste' ? 'text-red-600' : 'text-green-600';

  return (
    <div className="space-y-2">
      {sites.slice(0, 3).map((site, index) => (
        <div
          key={site.domain}
          className={`flex items-center justify-between p-2 ${bgColor} rounded-lg`}
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 bg-white rounded-full">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
              {site.domain}
            </span>
          </div>
          <span className={`text-sm font-medium ${textColor}`}>
            {formatTime(site.time)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Mini bar chart for daily/weekly breakdown
function MiniBarChart({
  data,
  type
}: {
  data: { wasteTime: number; investTime: number }[];
  type: 'daily' | 'weekly';
}) {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.wasteTime, d.investTime)),
    1
  );

  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="flex items-end justify-between gap-1 h-20">
      {data.map((item, index) => {
        const wasteHeight = (item.wasteTime / maxValue) * 100;
        const investHeight = (item.investTime / maxValue) * 100;

        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="flex gap-0.5 items-end h-16 w-full justify-center">
              <div
                className="w-2 bg-red-400 rounded-t"
                style={{ height: `${Math.max(wasteHeight, 2)}%` }}
                title={`${getMessage('waste')}: ${formatTime(item.wasteTime)}`}
              />
              <div
                className="w-2 bg-green-400 rounded-t"
                style={{ height: `${Math.max(investHeight, 2)}%` }}
                title={`${getMessage('invest')}: ${formatTime(item.investTime)}`}
              />
            </div>
            <span className="text-[10px] text-gray-500 mt-1">
              {type === 'daily' ? dayLabels[index] : `W${index + 1}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Empty state component
function EmptyReport({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

// Weekly Report Card
export function WeeklyReportCard({
  report,
  onPrevious,
  onNext,
  canGoNext
}: WeeklyReportCardProps) {
  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {getMessage('weeklyReport')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[120px] text-center">
            {report
              ? formatWeekRange(report.weekStart, report.weekEnd)
              : '---'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!report ? (
        <EmptyReport message={getMessage('noReportData')} />
      ) : (
        <div className="space-y-4">
          {/* Trend */}
          <div className="flex justify-end">
            <TrendIcon trend={report.trend} />
          </div>

          {/* Stats */}
          <StatsGrid
            wasteTime={report.totalWasteTime}
            investTime={report.totalInvestTime}
            blockCount={report.totalBlockCount}
          />

          {/* Daily Breakdown Chart */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {getMessage('dailyBreakdown')}
            </h4>
            <MiniBarChart
              data={report.dailyBreakdown.map((d) => ({
                wasteTime: d.wasteTime,
                investTime: d.investTime
              }))}
              type="daily"
            />
          </div>

          {/* Top Sites */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">
                {getMessage('topWasteSites')}
              </h4>
              <TopSitesList sites={report.topWasteSites} type="waste" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">
                {getMessage('topInvestSites')}
              </h4>
              <TopSitesList sites={report.topInvestSites} type="invest" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// Monthly Report Card
export function MonthlyReportCard({
  report,
  onPrevious,
  onNext,
  canGoNext
}: MonthlyReportCardProps) {
  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {getMessage('monthlyReport')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[120px] text-center">
            {report ? formatMonth(report.month) : '---'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!report ? (
        <EmptyReport message={getMessage('noReportData')} />
      ) : (
        <div className="space-y-4">
          {/* Trend */}
          <div className="flex justify-end">
            <TrendIcon trend={report.trend} />
          </div>

          {/* Stats */}
          <StatsGrid
            wasteTime={report.totalWasteTime}
            investTime={report.totalInvestTime}
            blockCount={report.totalBlockCount}
          />

          {/* Weekly Breakdown Chart */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {getMessage('weeklyBreakdown')}
            </h4>
            <MiniBarChart data={report.weeklyBreakdown} type="weekly" />
          </div>

          {/* Top Sites */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">
                {getMessage('topWasteSites')}
              </h4>
              <TopSitesList sites={report.topWasteSites} type="waste" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">
                {getMessage('topInvestSites')}
              </h4>
              <TopSitesList sites={report.topInvestSites} type="invest" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
