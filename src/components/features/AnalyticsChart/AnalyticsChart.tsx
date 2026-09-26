import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

import {
  cumulativeSeries,
  dailySeries,
  lastNDaysRange,
  rankSites,
  sumRange
} from '~/lib/activityStats';
import { getMessage } from '~/lib/i18n';
import { formatTime } from '~/lib/time';
import type { ActivityLog } from '~/types/activity';
import type { SiteKey } from '~/types/site';
import { DailyChart } from './DailyChart';
import { BySiteChart } from './BySiteChart';
import { CumulativeChart } from './CumulativeChart';

export type ChartType = 'daily' | 'bySite' | 'cumulative';

/** 3 系列と見出しの合計が共有する期間（今日を含む直近の日数）。見出しの文言にもこの値を渡す */
export const CHART_DAYS = 14;
/** サイト別グラフに並べるサイトの数 */
const BY_SITE_LIMIT = 8;
/** サイト別グラフの軸ラベルに収める文字数 */
const DOMAIN_LABEL_MAX = 15;
const SECONDS_PER_MINUTE = 60;

export interface AnalyticsChartProps {
  /** 事実の表 */
  activity: ActivityLog;
  /** 母集団（追跡中のサイト） */
  sites: readonly SiteKey[];
  disabled?: boolean;
}

function toMinutes(seconds: number): number {
  return Math.round(seconds / SECONDS_PER_MINUTE);
}

export function AnalyticsChart({
  activity,
  sites,
  disabled = false
}: AnalyticsChartProps) {
  const [chartType, setChartType] = useState<ChartType>('daily');

  // 日別・サイト別・累積・見出しの合計はすべてこの 1 つの期間から出す。
  // 系列ごとに期間を変えると、見出しの合計とグラフの和が食い違う
  const { totalSeconds, dailyData, bySiteData, cumulativeData } =
    useMemo(() => {
      const range = lastNDaysRange(new Date(), CHART_DAYS);
      const total = sumRange(activity, sites, range).seconds;
      // 期間内に表示時間が無ければ 0 の線ではなく「データなし」を出す
      if (total === 0) {
        return {
          totalSeconds: 0,
          dailyData: [],
          bySiteData: [],
          cumulativeData: []
        };
      }
      return {
        totalSeconds: total,
        dailyData: dailySeries(activity, sites, range).map((point) => ({
          date: point.date,
          time: toMinutes(point.seconds)
        })),
        bySiteData: rankSites(
          activity,
          sites,
          range,
          'seconds',
          BY_SITE_LIMIT
        ).map(({ domain, value }) => ({
          domain:
            domain.length > DOMAIN_LABEL_MAX
              ? domain.slice(0, DOMAIN_LABEL_MAX) + '...'
              : domain,
          fullDomain: domain,
          time: toMinutes(value)
        })),
        cumulativeData: cumulativeSeries(activity, sites, range).map(
          (point) => ({
            date: point.date,
            cumulative: toMinutes(point.seconds)
          })
        )
      };
    }, [activity, sites]);

  const renderChart = () => {
    switch (chartType) {
      case 'daily':
        return <DailyChart data={dailyData} />;
      case 'bySite':
        return <BySiteChart data={bySiteData} />;
      case 'cumulative':
        return <CumulativeChart data={cumulativeData} />;
    }
  };

  return (
    <div
      className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Summary */}
      <div className="p-4 bg-block-50 rounded-lg border border-block-100">
        <p className="text-sm text-block-600 font-medium">
          {getMessage('totalTimeOnTrackedSites', String(CHART_DAYS))}
        </p>
        <p className="text-2xl font-bold text-block-700">
          {formatTime(totalSeconds)}
        </p>
        <p className="text-xs text-block-500 mt-1">
          {getMessage('chartSiteCount', String(sites.length))}
        </p>
      </div>

      {/* Chart Type Selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          // 選択中かどうかを背景色でしか表していなかったため、押下状態を持たせる。
          // disabled は包む div の pointer-events だけではキーボード操作を止められない
          // （machina-gg/vision-focus#455）
          aria-pressed={chartType === 'daily'}
          disabled={disabled}
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
          aria-pressed={chartType === 'bySite'}
          disabled={disabled}
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
          aria-pressed={chartType === 'cumulative'}
          disabled={disabled}
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
