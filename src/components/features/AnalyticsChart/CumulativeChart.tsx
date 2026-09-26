import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { getMessage } from '~/lib/i18n';
import { formatDate, formatMinutes, getTimeAxisConfig } from './chartUtils';

/** 累計グラフの棒 1 本分 */
interface CumulativeChartData {
  /** 日付（YYYY-MM-DD） */
  date: string;
  /** その日までの累計閲覧時間（分） */
  cumulative: number;
}

/** CumulativeChart に渡す日ごとの累計 */
export interface CumulativeChartProps {
  /** 古い日から並べた累計（空なら「データなし」を出す） */
  data: CumulativeChartData[];
}

/**
 * 日ごとの累計閲覧時間を縦棒グラフで表示する（最大が 120 分以上なら軸を時間単位にする）
 * @param props 日ごとの累計（各フィールドは CumulativeChartProps）
 * @returns 縦棒グラフ。データが空なら「データなし」の表示
 */
export function CumulativeChart({ data }: CumulativeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {getMessage('noData')}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.cumulative), 0);
  const axisConfig = getTimeAxisConfig(maxValue);

  const displayData = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
    cumulative: axisConfig.transformData(d.cumulative)
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={displayData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={axisConfig.tickFormatter}
        />
        <Tooltip
          formatter={(value: number) => [
            formatMinutes(axisConfig.restoreValue(value)),
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
