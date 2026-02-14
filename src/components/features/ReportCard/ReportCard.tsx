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
  BarChart3,
  Unlock
} from 'lucide-react';
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

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
  isCurrentWeek?: boolean; // 当週の途中経過かどうか
}

interface MonthlyReportCardProps {
  report: MonthlyReport | null;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  isCurrentMonth?: boolean; // 当月の途中経過かどうか
}

// Trend icon component
function TrendIcon({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  if (trend === 'improving') {
    return (
      <div className="flex items-center gap-1 text-success-600">
        <TrendingUp className="w-4 h-4" />
        <span className="text-sm font-medium">{getMessage('improving')}</span>
      </div>
    );
  }
  if (trend === 'declining') {
    return (
      <div className="flex items-center gap-1 text-danger-600">
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

// Format waste time change percent for display
function formatChangePercent(value: number | null): string {
  if (value === null) {
    return getMessage('noComparisonData');
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// Stats grid component
function StatsGrid({
  wasteTime,
  blockCount,
  unblockCount,
  wasteTimeChangePercent
}: {
  wasteTime: number;
  blockCount: number;
  unblockCount: number;
  wasteTimeChangePercent: number | null;
}) {
  // Determine color for change percent: negative (less waste) = green, positive (more waste) = red
  const getChangeColor = (value: number | null) => {
    if (value === null)
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        label: 'text-gray-500'
      };
    if (value < 0)
      return {
        bg: 'bg-success-50',
        text: 'text-success-700',
        label: 'text-success-600'
      };
    if (value > 0)
      return {
        bg: 'bg-danger-50',
        text: 'text-danger-700',
        label: 'text-danger-600'
      };
    return { bg: 'bg-gray-50', text: 'text-gray-700', label: 'text-gray-500' };
  };

  const changeColors = getChangeColor(wasteTimeChangePercent);

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="text-center p-3 bg-danger-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-danger-600 mb-1">
          <Clock className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-danger-700">
          {formatTime(wasteTime)}
        </p>
        <p className="text-xs text-danger-600">{getMessage('wasteTime')}</p>
      </div>
      <div className={`text-center p-3 ${changeColors.bg} rounded-lg`}>
        <div
          className={`flex items-center justify-center gap-1 ${changeColors.label} mb-1`}
        >
          {wasteTimeChangePercent !== null && wasteTimeChangePercent < 0 ? (
            <TrendingDown className="w-4 h-4" />
          ) : wasteTimeChangePercent !== null && wasteTimeChangePercent > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
        </div>
        <p className={`text-lg font-bold ${changeColors.text}`}>
          {formatChangePercent(wasteTimeChangePercent)}
        </p>
        <p className={`text-xs ${changeColors.label}`}>
          {getMessage('previousPeriodComparison')}
        </p>
      </div>
      <div className="text-center p-3 bg-info-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-info-600 mb-1">
          <Shield className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-info-700">{blockCount}</p>
        <p className="text-xs text-info-600">{getMessage('blockedCount')}</p>
      </div>
      <div className="text-center p-3 bg-warning-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-warning-600 mb-1">
          <Unlock className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-warning-700">{unblockCount}</p>
        <p className="text-xs text-warning-600">
          {getMessage('unblockedCount')}
        </p>
      </div>
    </div>
  );
}

// Top waste sites list component
function TopSitesList({
  sites
}: {
  sites: { domain: string; time: number }[];
}) {
  if (sites.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-2">
        {getMessage('noData')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sites.slice(0, 3).map((site, index) => (
        <div
          key={site.domain}
          className="flex items-center justify-between p-2 bg-danger-50 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 bg-white rounded-full">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
              {site.domain}
            </span>
          </div>
          <span className="text-sm font-medium text-danger-600">
            {formatTime(site.time)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Top blocked sites list component
function TopBlockedSitesList({
  sites
}: {
  sites: { domain: string; count: number }[];
}) {
  if (sites.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-2">
        {getMessage('noData')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sites.slice(0, 3).map((site, index) => (
        <div
          key={site.domain}
          className="flex items-center justify-between p-2 bg-info-50 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 bg-white rounded-full">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
              {site.domain}
            </span>
          </div>
          <span className="text-sm font-medium text-info-600">
            {site.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// Day labels for chart
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Format minutes for chart tooltip
function formatMinutes(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Weekly combined chart: daily waste time bars + block count line
function WeeklyChart({
  dailyBreakdown,
  dailyBlockCounts
}: {
  dailyBreakdown: { wasteTime: number; blockCount: number }[];
  dailyBlockCounts: number[];
}) {
  const chartData = dailyBreakdown.map((d, i) => ({
    day: DAY_LABELS[i] || `D${i + 1}`,
    wasteTime: Math.round(d.wasteTime / 60), // Convert to minutes for display
    blockCount: dailyBlockCounts[i] || 0
  }));

  const maxWaste = Math.max(...chartData.map((d) => d.wasteTime), 1);
  const useHours = maxWaste >= 120;
  const displayData = useHours
    ? chartData.map((d) => ({ ...d, wasteTime: d.wasteTime / 60 }))
    : chartData;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={displayData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
        <YAxis
          yAxisId="waste"
          stroke="#ef4444"
          fontSize={12}
          tickFormatter={(v: number) => (useHours ? `${v}h` : `${v}m`)}
        />
        <YAxis
          yAxisId="block"
          orientation="right"
          stroke="#3b82f6"
          fontSize={12}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
          formatter={(value: number, name: string) => {
            if (name === 'wasteTime') {
              return [
                formatMinutes(useHours ? value * 3600 : value * 60),
                getMessage('wasteTime')
              ];
            }
            return [value, getMessage('blockedCount')];
          }}
        />
        <Bar
          yAxisId="waste"
          dataKey="wasteTime"
          fill="#fca5a5"
          radius={[4, 4, 0, 0]}
          name="wasteTime"
        />
        <Line
          yAxisId="block"
          type="monotone"
          dataKey="blockCount"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
          name="blockCount"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Monthly weekly trend chart: waste time bars + block count line
function MonthlyTrendChart({
  weeklyBreakdown
}: {
  weeklyBreakdown: {
    weekStart: string;
    wasteTime: number;
    blockCount: number;
  }[];
}) {
  const chartData = weeklyBreakdown.map((w, i) => ({
    week: `W${i + 1}`,
    wasteTime: Math.round(w.wasteTime / 60), // Convert to minutes
    blockCount: w.blockCount
  }));

  const maxWaste = Math.max(...chartData.map((d) => d.wasteTime), 1);
  const useHours = maxWaste >= 120;
  const displayData = useHours
    ? chartData.map((d) => ({ ...d, wasteTime: d.wasteTime / 60 }))
    : chartData;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={displayData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="week" stroke="#6b7280" fontSize={12} />
        <YAxis
          yAxisId="waste"
          stroke="#ef4444"
          fontSize={12}
          tickFormatter={(v: number) => (useHours ? `${v}h` : `${v}m`)}
        />
        <YAxis
          yAxisId="block"
          orientation="right"
          stroke="#3b82f6"
          fontSize={12}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
          formatter={(value: number, name: string) => {
            if (name === 'wasteTime') {
              return [
                formatMinutes(useHours ? value * 3600 : value * 60),
                getMessage('wasteTime')
              ];
            }
            return [value, getMessage('blockedCount')];
          }}
        />
        <Bar
          yAxisId="waste"
          dataKey="wasteTime"
          fill="#fca5a5"
          radius={[4, 4, 0, 0]}
          name="wasteTime"
        />
        <Line
          yAxisId="block"
          type="monotone"
          dataKey="blockCount"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
          name="blockCount"
        />
      </ComposedChart>
    </ResponsiveContainer>
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
  canGoNext,
  isCurrentWeek = false
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
          {isCurrentWeek && (
            <span className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-md">
              {getMessage('inProgress')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[120px] text-center">
            {report ? formatWeekRange(report.weekStart, report.weekEnd) : '---'}
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
            blockCount={report.totalBlockCount}
            unblockCount={report.totalUnblockCount}
            wasteTimeChangePercent={report.wasteTimeChangePercent}
          />

          {/* Daily Chart: Waste Time + Block Count */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {getMessage('dailyBreakdown')}
            </h4>
            <WeeklyChart
              dailyBreakdown={report.dailyBreakdown.map((d) => ({
                wasteTime: d.wasteTime,
                blockCount: d.blockCount
              }))}
              dailyBlockCounts={report.dailyBlockCounts}
            />
          </div>

          {/* Top Sites */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-medium text-danger-700 mb-2">
                {getMessage('topWasteSites')}
              </h4>
              <TopSitesList sites={report.topWasteSites} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-info-700 mb-2">
                {getMessage('topBlockedSites')}
              </h4>
              <TopBlockedSitesList sites={report.topBlockedSites} />
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
  canGoNext,
  isCurrentMonth = false
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
          {isCurrentMonth && (
            <span className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-md">
              {getMessage('inProgress')}
            </span>
          )}
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
            blockCount={report.totalBlockCount}
            unblockCount={report.totalUnblockCount}
            wasteTimeChangePercent={report.wasteTimeChangePercent}
          />

          {/* Weekly Trend Chart */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {getMessage('weeklyTrend')}
            </h4>
            <MonthlyTrendChart weeklyBreakdown={report.weeklyBreakdown} />
          </div>

          {/* Top Sites */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-medium text-danger-700 mb-2">
                {getMessage('topWasteSites')}
              </h4>
              <TopSitesList sites={report.topWasteSites} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-info-700 mb-2">
                {getMessage('topBlockedSites')}
              </h4>
              <TopBlockedSitesList sites={report.topBlockedSites} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
