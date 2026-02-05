import React, { useState, useMemo } from 'react';

import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

import type { AnalyticsData, UnblockHistory } from '~/types/storage';
import { getMessage } from '~/lib/i18n';
import { formatTime } from '~/lib/time';

export type ChartType = 'daily' | 'bySite' | 'cumulative';

export interface AnalyticsChartProps {
  analytics: AnalyticsData;
  unblockHistory: UnblockHistory;
  disabled?: boolean;
}

// Color palette for different sites (soft pastel tones)
const SITE_COLORS = [
  '#fdba74', // orange-300
  '#fcd34d', // amber-300
  '#bef264', // lime-300
  '#6ee7b7', // emerald-300
  '#67e8f9', // cyan-300
  '#a5b4fc', // indigo-300
  '#d8b4fe', // purple-300
  '#f9a8d4' // pink-300
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function AnalyticsChart({
  analytics,
  unblockHistory,
  disabled = false
}: AnalyticsChartProps) {
  const [chartType, setChartType] = useState<ChartType>('daily');

  // Get list of unblocked domains
  const unblockedDomains = useMemo(() => {
    return Object.keys(unblockHistory.sites);
  }, [unblockHistory.sites]);

  // A. Daily total time on unblocked sites
  const dailyData = useMemo(() => {
    const entries = Object.entries(analytics.dailyStats)
      .map(([date, stat]) => ({
        date,
        time: Math.round(stat.wasteTime / 60) // Convert to minutes
      }))
      .filter((e) => e.time > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days

    // If no daily stats, show current total as today's data
    if (entries.length === 0) {
      const currentTotal = Object.values(unblockHistory.sites).reduce(
        (sum, site) => sum + site.timeAfterUnblock,
        0
      );
      if (currentTotal > 0) {
        return [
          {
            date: formatDate(new Date().toISOString().split('T')[0]),
            time: Math.round(currentTotal / 60)
          }
        ];
      }
      return [];
    }

    return entries.map((e) => ({
      ...e,
      date: formatDate(e.date)
    }));
  }, [analytics.dailyStats, unblockHistory.sites]);

  // B. Site-by-site breakdown (stacked)
  const bySiteData = useMemo(() => {
    // Get daily breakdown per site from siteTime
    // For now, show total per site as a simple bar chart
    const siteData = unblockedDomains
      .map((domain) => ({
        domain: domain.length > 15 ? domain.slice(0, 15) + '...' : domain,
        fullDomain: domain,
        time: Math.round(
          (unblockHistory.sites[domain]?.timeAfterUnblock || 0) / 60
        )
      }))
      .filter((s) => s.time > 0)
      .sort((a, b) => b.time - a.time)
      .slice(0, 8); // Top 8 sites

    return siteData;
  }, [unblockedDomains, unblockHistory.sites]);

  // C. Cumulative time since unblock
  const cumulativeData = useMemo(() => {
    // Find earliest unblock date
    const unblockedSites = Object.values(unblockHistory.sites);
    if (unblockedSites.length === 0) return [];

    const earliestUnblock = unblockedSites.reduce((earliest, site) => {
      const date = new Date(site.unblockedAt);
      return date < earliest ? date : earliest;
    }, new Date());

    // Generate cumulative data from daily stats
    const dailyEntries = Object.entries(analytics.dailyStats)
      .filter(([date]) => new Date(date) >= earliestUnblock)
      .sort(([a], [b]) => a.localeCompare(b));

    // If no daily stats, show at least current total as a single point
    if (dailyEntries.length === 0) {
      const currentTotal = unblockedSites.reduce(
        (sum, site) => sum + site.timeAfterUnblock,
        0
      );
      if (currentTotal > 0) {
        return [
          {
            date: formatDate(new Date().toISOString().split('T')[0]),
            cumulative: Math.round(currentTotal / 60)
          }
        ];
      }
      return [];
    }

    let cumulative = 0;
    const data = dailyEntries.map(([date, stat]) => {
      cumulative += stat.wasteTime;
      return {
        date: formatDate(date),
        cumulative: Math.round(cumulative / 60) // Minutes
      };
    });

    return data.slice(-14); // Last 14 days
  }, [analytics.dailyStats, unblockHistory.sites]);

  // Total time across all unblocked sites
  const totalTime = useMemo(() => {
    return Object.values(unblockHistory.sites).reduce(
      (sum, site) => sum + site.timeAfterUnblock,
      0
    );
  }, [unblockHistory.sites]);

  // Dynamic Y-axis unit switching for daily chart
  const maxDailyValue = Math.max(...dailyData.map((d) => d.time), 0);
  const useDailyHours = maxDailyValue >= 120;
  const displayDailyData = useDailyHours
    ? dailyData.map((d) => ({ ...d, time: d.time / 60 }))
    : dailyData;
  const dailyTickFormatter = (v: number) => (useDailyHours ? `${v}h` : `${v}m`);

  // Dynamic Y-axis unit switching for cumulative chart
  const maxCumulativeValue = Math.max(
    ...cumulativeData.map((d) => d.cumulative),
    0
  );
  const useCumulativeHours = maxCumulativeValue >= 120;
  const displayCumulativeData = useCumulativeHours
    ? cumulativeData.map((d) => ({ ...d, cumulative: d.cumulative / 60 }))
    : cumulativeData;
  const cumulativeTickFormatter = (v: number) =>
    useCumulativeHours ? `${v}h` : `${v}m`;

  const renderChart = () => {
    switch (chartType) {
      case 'daily':
        if (dailyData.length === 0) {
          return (
            <div className="flex items-center justify-center h-64 text-gray-500">
              {getMessage('noData')}
            </div>
          );
        }
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={displayDailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={dailyTickFormatter}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatMinutes(useDailyHours ? value * 60 : value),
                  getMessage('chartDailyLabel')
                ]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="time"
                stroke="#fdba74"
                strokeWidth={2}
                dot={{ fill: '#fdba74', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#fb923c' }}
                name={getMessage('chartDailyLabel')}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bySite':
        if (bySiteData.length === 0) {
          return (
            <div className="flex items-center justify-center h-64 text-gray-500">
              {getMessage('noData')}
            </div>
          );
        }
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bySiteData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(v) => `${v}m`}
              />
              <YAxis
                type="category"
                dataKey="domain"
                stroke="#6b7280"
                fontSize={11}
                width={100}
              />
              <Tooltip
                formatter={(value: number, _name: string, props) => {
                  const payload = props?.payload as
                    | { fullDomain?: string }
                    | undefined;
                  return [formatMinutes(value), payload?.fullDomain || ''];
                }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="time" radius={[0, 4, 4, 0]}>
                {bySiteData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={SITE_COLORS[index % SITE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'cumulative':
        if (cumulativeData.length === 0) {
          return (
            <div className="flex items-center justify-center h-64 text-gray-500">
              {getMessage('noData')}
            </div>
          );
        }
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={displayCumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={cumulativeTickFormatter}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatMinutes(useCumulativeHours ? value * 60 : value),
                  getMessage('chartCumulativeLabel')
                ]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar
                dataKey="cumulative"
                fill="#fdba74"
                radius={[4, 4, 0, 0]}
                name={getMessage('chartCumulativeLabel')}
              />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div
      className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Summary */}
      <div className="p-4 bg-block-50 rounded-lg border border-block-100">
        <p className="text-sm text-block-600 font-medium">
          {getMessage('totalTimeOnUnblockedSites')}
        </p>
        <p className="text-2xl font-bold text-block-700">
          {formatTime(totalTime)}
        </p>
        <p className="text-xs text-block-500 mt-1">
          {getMessage('chartSiteCount', String(unblockedDomains.length))}
        </p>
      </div>

      {/* Chart Type Selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setChartType('daily')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors
            ${
              chartType === 'daily'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <BarChart3 className="w-4 h-4" />
          {getMessage('chartTypeDaily')}
        </button>
        <button
          onClick={() => setChartType('bySite')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors
            ${
              chartType === 'bySite'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Layers className="w-4 h-4" />
          {getMessage('chartTypeBySite')}
        </button>
        <button
          onClick={() => setChartType('cumulative')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors
            ${
              chartType === 'cumulative'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <TrendingUp className="w-4 h-4" />
          {getMessage('chartTypeCumulative')}
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        {renderChart()}
      </div>
    </div>
  );
}
