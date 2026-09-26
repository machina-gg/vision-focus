import React from 'react';
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
import { getMessage } from '~/lib/i18n';

/** WeeklyChart に渡す曜日ごとの集計 */
interface WeeklyChartProps {
  /** 月曜から順に並べた日ごとの集計（wasteTime は秒。棒に使うのは wasteTime だけ） */
  dailyBreakdown: { wasteTime: number; blockCount: number }[];
  /** 月曜から順に並べた日ごとのブロック回数（折れ線に使う。欠けた日は 0） */
  dailyBlockCounts: number[];
}

function getDayLabels(): string[] {
  return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((key) =>
    getMessage(key)
  );
}

function formatChartMinutes(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * 週の曜日ごとの時間を棒、ブロック回数を折れ線で重ねて表示する（最大が 120 分以上なら時間の軸を時間単位にする）
 * @param props 曜日ごとの集計（各フィールドは WeeklyChartProps）
 * @returns 棒と折れ線の複合グラフ
 */
export function WeeklyChart({
  dailyBreakdown,
  dailyBlockCounts
}: WeeklyChartProps) {
  const dayLabels = getDayLabels();
  const chartData = dailyBreakdown.map((d, i) => ({
    day: dayLabels[i] || `D${i + 1}`,
    wasteTime: Math.round(d.wasteTime / 60),
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
                formatChartMinutes(useHours ? value * 3600 : value * 60),
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
