import React, { useState, useMemo } from 'react'

import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
} from 'lucide-react'

import { Card, Button } from '~/components/ui'
import type { AnalyticsData } from '~/types/storage'
import {
  generateWeeklyReport,
  generateMonthlyReport,
  getAvailableWeeks,
  getAvailableMonths,
} from '~/lib/reports'
import { formatTime } from '~/lib/time'
import { getMessage } from '~/lib/i18n'

export type ReportType = 'weekly' | 'monthly'

export interface ReportCardProps {
  analytics: AnalyticsData
  type: ReportType
  disabled?: boolean
}

function TrendIcon({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-green-500" />
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-red-500" />
    case 'stable':
      return <Minus className="w-4 h-4 text-gray-500" />
  }
}

export function ReportCard({
  analytics,
  type,
  disabled = false,
}: ReportCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Get available periods
  const periods = useMemo(() => {
    if (type === 'weekly') {
      return getAvailableWeeks(analytics)
    }
    return getAvailableMonths(analytics)
  }, [analytics, type])

  // Generate current report
  const report = useMemo(() => {
    if (periods.length === 0) return null

    if (type === 'weekly') {
      const week = periods[selectedIndex] as { start: string; end: string }
      return generateWeeklyReport(analytics, new Date(week.start))
    }

    const month = periods[selectedIndex] as string
    return generateMonthlyReport(analytics, month)
  }, [analytics, type, periods, selectedIndex])

  const hasPrevious = selectedIndex < periods.length - 1
  const hasNext = selectedIndex > 0

  const handlePrevious = () => {
    if (hasPrevious) setSelectedIndex(selectedIndex + 1)
  }

  const handleNext = () => {
    if (hasNext) setSelectedIndex(selectedIndex - 1)
  }

  const getPeriodLabel = () => {
    if (!periods.length) return ''

    if (type === 'weekly') {
      const week = periods[selectedIndex] as { start: string; end: string }
      const startDate = new Date(week.start)
      const endDate = new Date(week.end)
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }

    const month = periods[selectedIndex] as string
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (!report) {
    return (
      <Card
        variant="default"
        padding="md"
        className={disabled ? 'opacity-50' : ''}
      >
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">{getMessage('noReportData')}</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      {/* Summary Card */}
      <Card
        variant="elevated"
        padding="md"
        onClick={() => setIsModalOpen(true)}
        className={`cursor-pointer hover:shadow-lg transition-shadow ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">
              {type === 'weekly'
                ? getMessage('weeklyReport')
                : getMessage('monthlyReport')}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon trend={report.trend} />
            <span className="text-sm text-gray-600">
              {report.trend === 'improving'
                ? getMessage('improving')
                : report.trend === 'declining'
                  ? getMessage('declining')
                  : getMessage('stable')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">{getMessage('wasteTime')}</p>
            <p className="text-lg font-bold text-red-600">
              {formatTime(report.totalWasteTime)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{getMessage('investTime')}</p>
            <p className="text-lg font-bold text-green-600">
              {formatTime(report.totalInvestTime)}
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          {getMessage('clickForDetails')}
        </p>
      </Card>

      {/* Detail Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {type === 'weekly'
                  ? getMessage('weeklyReport')
                  : getMessage('monthlyReport')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <button
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className={`p-1 rounded ${hasPrevious ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium text-gray-700">
                {getPeriodLabel()}
              </span>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className={`p-1 rounded ${hasNext ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Trend */}
              <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg">
                <TrendIcon trend={report.trend} />
                <span className="font-medium">
                  {report.trend === 'improving'
                    ? getMessage('productivityImproving')
                    : report.trend === 'declining'
                      ? getMessage('productivityDeclining')
                      : getMessage('productivityStable')}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <Clock className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-red-600">
                    {getMessage('wasteTime')}
                  </p>
                  <p className="text-lg font-bold text-red-700">
                    {formatTime(report.totalWasteTime)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-green-600">
                    {getMessage('investTime')}
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    {formatTime(report.totalInvestTime)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <Shield className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-blue-600">
                    {getMessage('blocked')}
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    {report.totalBlockCount}
                  </p>
                </div>
              </div>

              {/* Top Sites */}
              <div className="grid grid-cols-2 gap-4">
                {/* Top Waste Sites */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {getMessage('topWasteSites')}
                  </h4>
                  {report.topWasteSites.length > 0 ? (
                    <ul className="space-y-1">
                      {report.topWasteSites.slice(0, 3).map((site, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between text-sm p-2 bg-red-50 rounded"
                        >
                          <span className="truncate text-gray-700">
                            {site.domain}
                          </span>
                          <span className="text-red-600 font-medium ml-2">
                            {formatTime(site.time)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">
                      {getMessage('noData')}
                    </p>
                  )}
                </div>

                {/* Top Invest Sites */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {getMessage('topInvestSites')}
                  </h4>
                  {report.topInvestSites.length > 0 ? (
                    <ul className="space-y-1">
                      {report.topInvestSites.slice(0, 3).map((site, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between text-sm p-2 bg-green-50 rounded"
                        >
                          <span className="truncate text-gray-700">
                            {site.domain}
                          </span>
                          <span className="text-green-600 font-medium ml-2">
                            {formatTime(site.time)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">
                      {getMessage('noData')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="w-full"
              >
                {getMessage('close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
