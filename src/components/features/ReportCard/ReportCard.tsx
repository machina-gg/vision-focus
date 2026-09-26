import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, Button } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { formatWeekRange, formatMonth } from '~/lib/report';
import type { WeeklyReport, MonthlyReport } from '~/types/report';

import { TrendIcon } from './TrendIcon';
import { StatsGrid } from './StatsGrid';
import { RankedList } from './RankedList';
import { WeeklyChart } from './WeeklyChart';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { EmptyReport } from './EmptyReport';

/** WeeklyReportCard に渡す週のレポートと週の移動 */
interface WeeklyReportCardProps {
  /** 表示する週のレポート（null ならデータなしの案内を出す） */
  report: WeeklyReport | null;
  /** 前の週へ移るボタンが押されたときに呼ぶ */
  onPrevious: () => void;
  /** 次の週へ移るボタンが押されたときに呼ぶ */
  onNext: () => void;
  /** false なら次の週へ移るボタンを押せなくする */
  canGoNext: boolean;
  /** true なら今週（集計途中）の印を出す */
  isCurrentWeek?: boolean;
}

/** MonthlyReportCard に渡す月のレポートと月の移動 */
interface MonthlyReportCardProps {
  /** 表示する月のレポート（null ならデータなしの案内を出す） */
  report: MonthlyReport | null;
  /** 前の月へ移るボタンが押されたときに呼ぶ */
  onPrevious: () => void;
  /** 次の月へ移るボタンが押されたときに呼ぶ */
  onNext: () => void;
  /** false なら次の月へ移るボタンを押せなくする */
  canGoNext: boolean;
  /** true なら今月（集計途中）の印を出す */
  isCurrentMonth?: boolean;
}

/**
 * 週のレポート（傾向・集計値・曜日ごとのグラフ・上位サイト）を、週を移動できるカードで表示する
 * @param props 週のレポートと週の移動（各フィールドは WeeklyReportCardProps）
 * @returns 週のレポートのカード
 */
export function WeeklyReportCard({
  report,
  onPrevious,
  onNext,
  canGoNext,
  isCurrentWeek = false
}: WeeklyReportCardProps) {
  return (
    <Card>
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
          <Button
            variant="ghost"
            size="sm"
            aria-label={getMessage('previousWeek')}
            onClick={onPrevious}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[120px] text-center">
            {report ? formatWeekRange(report.weekStart, report.weekEnd) : '---'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label={getMessage('nextWeek')}
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
          <div className="flex justify-end">
            <TrendIcon trend={report.trend} />
          </div>

          <StatsGrid
            wasteTime={report.totals.seconds}
            blockCount={report.totals.blocks}
            unblockCount={report.totals.unblocks}
            wasteTimeChangePercent={report.wasteTimeChangePercent}
          />

          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {getMessage('dailyBreakdown')}
            </h4>
            <WeeklyChart
              dailyBreakdown={report.dailyBreakdown.map((d) => ({
                wasteTime: d.seconds,
                blockCount: d.blocks
              }))}
              dailyBlockCounts={report.dailyBreakdown.map((d) => d.blocks)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-medium text-danger-700 mb-2">
                {getMessage('topWasteSites')}
              </h4>
              <RankedList
                items={report.topWasteSites}
                valueType="time"
                bgColor="bg-danger-50"
                textColor="text-danger-600"
              />
            </div>
            <div>
              <h4 className="text-sm font-medium text-info-700 mb-2">
                {getMessage('topBlockedSites')}
              </h4>
              <RankedList
                items={report.topBlockedSites}
                valueType="count"
                bgColor="bg-info-50"
                textColor="text-info-600"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * 月のレポート（傾向・集計値・週ごとのグラフ・上位サイト）を、月を移動できるカードで表示する
 * @param props 月のレポートと月の移動（各フィールドは MonthlyReportCardProps）
 * @returns 月のレポートのカード
 */
export function MonthlyReportCard({
  report,
  onPrevious,
  onNext,
  canGoNext,
  isCurrentMonth = false
}: MonthlyReportCardProps) {
  return (
    <Card>
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
          <Button
            variant="ghost"
            size="sm"
            aria-label={getMessage('previousMonth')}
            onClick={onPrevious}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[120px] text-center">
            {report ? formatMonth(report.month) : '---'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label={getMessage('nextMonth')}
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
          <div className="flex justify-end">
            <TrendIcon trend={report.trend} />
          </div>

          <StatsGrid
            wasteTime={report.totals.seconds}
            blockCount={report.totals.blocks}
            unblockCount={report.totals.unblocks}
            wasteTimeChangePercent={report.wasteTimeChangePercent}
          />

          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {getMessage('weeklyTrend')}
            </h4>
            <MonthlyTrendChart
              weeklyBreakdown={report.weeklyBreakdown.map((w) => ({
                weekStart: w.weekStart,
                wasteTime: w.seconds,
                blockCount: w.blocks
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-medium text-danger-700 mb-2">
                {getMessage('topWasteSites')}
              </h4>
              <RankedList
                items={report.topWasteSites}
                valueType="time"
                bgColor="bg-danger-50"
                textColor="text-danger-600"
              />
            </div>
            <div>
              <h4 className="text-sm font-medium text-info-700 mb-2">
                {getMessage('topBlockedSites')}
              </h4>
              <RankedList
                items={report.topBlockedSites}
                valueType="count"
                bgColor="bg-info-50"
                textColor="text-info-600"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
