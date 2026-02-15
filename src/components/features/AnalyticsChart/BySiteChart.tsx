import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { getMessage } from '~/lib/i18n';
import { formatMinutes, SITE_COLORS } from './chartUtils';

export interface BySiteChartData {
  domain: string;
  fullDomain: string;
  time: number;
}

export interface BySiteChartProps {
  data: BySiteChartData[];
}

/**
 * サイト別チャート: トップ 8 サイトの使用時間を横棒グラフで表示
 */
export function BySiteChart({ data }: BySiteChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {getMessage('noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(v) => `${v}m`}
        />
        <YAxis
          type="category"
          dataKey="domain"
          stroke="#6b7280"
          fontSize={11}
          width={100}
        />
        <Tooltip
          formatter={(value: number, _name: string, props) => {
            const payload = props?.payload as
              | { fullDomain?: string }
              | undefined;
            return [formatMinutes(value), payload?.fullDomain || ''];
          }}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Bar dataKey="time" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={SITE_COLORS[index % SITE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
