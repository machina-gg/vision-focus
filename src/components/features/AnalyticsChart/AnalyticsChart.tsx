import React, { useState, useMemo } from 'react'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3, LineChartIcon, PieChartIcon } from 'lucide-react'

import type { AnalyticsData, DailyStat } from '~/types/storage'
import { getMessage } from '~/lib/i18n'
import { formatTime } from '~/lib/reports'

export type ChartType = 'line' | 'bar' | 'pie'
export type DateRange = '7d' | '30d' | 'all'

export interface AnalyticsChartProps {
  analytics: AnalyticsData
  disabled?: boolean
}

const COLORS = {
  waste: '#ef4444', // Red
  invest: '#22c55e', // Green
  neutral: '#6b7280', // Gray
}

const PIE_COLORS = ['#ef4444', '#22c55e', '#6b7280', '#3b82f6', '#f59e0b']

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function AnalyticsChart({
  analytics,
  disabled = false,
}: AnalyticsChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line')
  const [dateRange, setDateRange] = useState<DateRange>('7d')

  // Get daily data for the selected range
  const dailyData = useMemo(() => {
    const now = new Date()
    const entries = Object.entries(analytics.dailyStats)
      .map(([date, stat]) => ({ ...stat, date }))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (dateRange === '7d') {
      const cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() - 7)
      return entries.filter((e) => new Date(e.date) >= cutoff)
    }

    if (dateRange === '30d') {
      const cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() - 30)
      return entries.filter((e) => new Date(e.date) >= cutoff)
    }

    return entries
  }, [analytics.dailyStats, dateRange])

  // Get category breakdown for pie chart
  const categoryData = useMemo(() => {
    const totals = { waste: 0, invest: 0, neutral: 0 }

    Object.values(analytics.siteTime).forEach((site) => {
      totals[site.category] += site.time
    })

    return [
      { name: getMessage('waste'), value: totals.waste, color: COLORS.waste },
      { name: getMessage('invest'), value: totals.invest, color: COLORS.invest },
      { name: getMessage('neutral'), value: totals.neutral, color: COLORS.neutral },
    ].filter((d) => d.value > 0)
  }, [analytics.siteTime])

  // Summary statistics
  const summary = useMemo(() => {
    const totalWaste = dailyData.reduce((sum, d) => sum + d.wasteTime, 0)
    const totalInvest = dailyData.reduce((sum, d) => sum + d.investTime, 0)
    const totalBlocks = dailyData.reduce((sum, d) => sum + d.blockCount, 0)

    return { totalWaste, totalInvest, totalBlocks }
  }, [dailyData])

  const chartData = dailyData.map((d) => ({
    date: formatDate(d.date),
    [getMessage('waste')]: Math.round(d.wasteTime / 60), // Convert to minutes
    [getMessage('invest')]: Math.round(d.investTime / 60),
  }))

  const renderChart = () => {
    if (dailyData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          {getMessage('noData')}
        </div>
      )
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(v) => `${v}m`}
              />
              <Tooltip
                formatter={(value: number) => [`${value} min`, '']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={getMessage('waste')}
                stroke={COLORS.waste}
                strokeWidth={2}
                dot={{ fill: COLORS.waste, strokeWidth: 0, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey={getMessage('invest')}
                stroke={COLORS.invest}
                strokeWidth={2}
                dot={{ fill: COLORS.invest, strokeWidth: 0, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(v) => `${v}m`}
              />
              <Tooltip
                formatter={(value: number) => [`${value} min`, '']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey={getMessage('waste')} fill={COLORS.waste} radius={[4, 4, 0, 0]} />
              <Bar dataKey={getMessage('invest')} fill={COLORS.invest} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatSeconds(value), '']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-red-50 rounded-lg">
          <p className="text-xs text-red-600 font-medium">{getMessage('wasteTime')}</p>
          <p className="text-lg font-bold text-red-700">
            {formatTime(summary.totalWaste)}
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 font-medium">{getMessage('investTime')}</p>
          <p className="text-lg font-bold text-green-700">
            {formatTime(summary.totalInvest)}
          </p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-medium">{getMessage('blockedCount')}</p>
          <p className="text-lg font-bold text-blue-700">{summary.totalBlocks}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Date Range */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['7d', '30d', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`
                px-3 py-1 text-sm rounded-md transition-colors
                ${dateRange === range
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All'}
            </button>
          ))}
        </div>

        {/* Chart Type */}
        <div className="flex gap-1">
          <button
            onClick={() => setChartType('line')}
            className={`
              p-2 rounded-lg transition-colors
              ${chartType === 'line'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-400 hover:text-gray-600'}
            `}
            title={getMessage('lineChart')}
          >
            <LineChartIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`
              p-2 rounded-lg transition-colors
              ${chartType === 'bar'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-400 hover:text-gray-600'}
            `}
            title={getMessage('barChart')}
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`
              p-2 rounded-lg transition-colors
              ${chartType === 'pie'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-400 hover:text-gray-600'}
            `}
            title={getMessage('pieChart')}
          >
            <PieChartIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        {renderChart()}
      </div>
    </div>
  )
}
