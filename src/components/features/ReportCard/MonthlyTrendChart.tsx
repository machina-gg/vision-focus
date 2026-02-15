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

interface MonthlyTrendChartProps {
  weeklyBreakdown: {
    weekStart: string;
    wasteTime: number;
    blockCount: number;
  }[];
}

/**
 * 月次チャート用のフォーマット（秒 → 分/時間）
 */
function formatChartMinutes(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * 月次トレンドチャート: 週別の無駄時間（棒グラフ）+ ブロック数（折れ線グラフ）
 */
export function MonthlyTrendChart({ weeklyBreakdown }: MonthlyTrendChartProps) {
  const chartData = weeklyBreakdown.map((w, i) => ({
    week: `W${i + 1}`,
    wasteTime: Math.round(w.wasteTime / 60), // 分に変換
    blockCount: w.blockCount
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
        <XAxis dataKey="week" stroke="#6b7280" fontSize={12} />
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
