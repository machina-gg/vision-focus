import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { getMessage } from '~/lib/i18n';
import { formatDate, formatMinutes, getTimeAxisConfig } from './chartUtils';

export interface DailyChartData {
  date: string;
  time: number;
}

export interface DailyChartProps {
  data: DailyChartData[];
}

/**
 * 日次チャート: 過去 14 日間のトラッキング時間を折れ線グラフで表示
 */
export function DailyChart({ data }: DailyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {getMessage('noData')}
      </div>
    );
  }

  // Y 軸の単位を動的に決定
  const maxValue = Math.max(...data.map((d) => d.time), 0);
  const axisConfig = getTimeAxisConfig(maxValue);

  // データを変換（時間単位の場合のみ）
  const displayData = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
    time: axisConfig.transformData(d.time)
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={displayData}>
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
}
