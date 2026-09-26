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

/** サイト別グラフの棒 1 本分 */
export interface BySiteChartData {
  /** 軸に出すドメイン（長いものは省略記号付きで切り詰めたもの） */
  domain: string;
  /** ツールチップに出す切り詰める前のドメイン */
  fullDomain: string;
  /** 閲覧時間（分） */
  time: number;
}

/** BySiteChart に渡す棒のデータ */
export interface BySiteChartProps {
  /** 上から並べる棒（空なら「データなし」を出す） */
  data: BySiteChartData[];
}

/**
 * サイトごとの閲覧時間を横棒グラフで表示する
 * @param props 棒のデータ（各フィールドは BySiteChartProps）
 * @returns 横棒グラフ。データが空なら「データなし」の表示
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
              { fullDomain?: string } | undefined;
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
