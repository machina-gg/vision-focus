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

/** 日別グラフの点 1 つ分 */
interface DailyChartData {
  /** 日付（YYYY-MM-DD） */
  date: string;
  /** その日の閲覧時間（分） */
  time: number;
}

/** DailyChart に渡す日ごとの閲覧時間 */
export interface DailyChartProps {
  /** 古い日から並べた閲覧時間（空なら「データなし」を出す） */
  data: DailyChartData[];
}

/**
 * 日ごとの閲覧時間を折れ線グラフで表示する（最大が 120 分以上なら軸を時間単位にする）
 * @param props 日ごとの閲覧時間（各フィールドは DailyChartProps）
 * @returns 折れ線グラフ。データが空なら「データなし」の表示
 */
export function DailyChart({ data }: DailyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {getMessage('noData')}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.time), 0);
  const axisConfig = getTimeAxisConfig(maxValue);

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
