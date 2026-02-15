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

export interface CumulativeChartData {
  date: string;
  cumulative: number;
}

export interface CumulativeChartProps {
  data: CumulativeChartData[];
}

/**
 * 累積チャート: アンブロック以降の累積時間を棒グラフで表示
 */
export function CumulativeChart({ data }: CumulativeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {getMessage('noData')}
      </div>
    );
  }

  // Y 軸の単位を動的に決定
  const maxValue = Math.max(...data.map((d) => d.cumulative), 0);
  const axisConfig = getTimeAxisConfig(maxValue);

  // データを変換（時間単位の場合のみ）
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
