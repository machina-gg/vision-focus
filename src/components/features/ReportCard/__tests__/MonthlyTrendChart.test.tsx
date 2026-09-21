import React from 'react';

import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MonthlyTrendChart } from '../MonthlyTrendChart';

/**
 * MonthlyTrendChart が組み立てるグラフ用データと単位の切り替えの検査
 *
 * 週ごとの無駄時間（秒）を分へ丸め、一番多い週が 2 時間以上なら時間表示へ
 * 切り替える。週の数は月によって 4〜6 と変わるため、件数に依存せず
 * 通し番号のラベルが付くことも見る。
 *
 * グラフ本体は recharts に任せており jsdom では寸法が 0 で描画されないため、
 * 受け取った props を読める形に差し替えて「何を渡したか」を見る。
 */

const chart = vi.hoisted(() => ({
  data: [] as { week: string; wasteTime: number; blockCount: number }[],
  wasteTickFormatter: undefined as ((value: number) => string) | undefined,
  tooltipFormatter: undefined as
    ((value: number, name: string) => [unknown, string]) | undefined
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ComposedChart: ({
    data,
    children
  }: {
    data: typeof chart.data;
    children: React.ReactNode;
  }) => {
    chart.data = data;
    return <div data-testid="chart">{children}</div>;
  },
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: ({
    yAxisId,
    tickFormatter
  }: {
    yAxisId: string;
    tickFormatter?: (value: number) => string;
  }) => {
    if (yAxisId === 'waste') chart.wasteTickFormatter = tickFormatter;
    return null;
  },
  Tooltip: ({
    formatter
  }: {
    formatter: (value: number, name: string) => [unknown, string];
  }) => {
    chart.tooltipFormatter = formatter;
    return null;
  },
  Bar: () => null,
  Line: () => null
}));

/** 週ごとの内訳（無駄時間は秒） */
const weeksOf = (weeks: { waste: number; blocks?: number }[]) =>
  weeks.map((week, index) => ({
    weekStart: `2026-03-0${index + 1}`,
    wasteTime: week.waste,
    blockCount: week.blocks ?? 0
  }));

const renderChart = (weeks: { waste: number; blocks?: number }[]) =>
  render(<MonthlyTrendChart weeklyBreakdown={weeksOf(weeks)} />);

beforeEach(() => {
  chart.data = [];
  chart.wasteTickFormatter = undefined;
  chart.tooltipFormatter = undefined;
});

describe('MonthlyTrendChart', () => {
  describe('週のラベル', () => {
    it('渡された順に通し番号を付ける', () => {
      renderChart([{ waste: 0 }, { waste: 0 }, { waste: 0 }]);

      expect(chart.data.map((d) => d.week)).toEqual(['W1', 'W2', 'W3']);
    });

    it('週が 6 つある月でも欠けずに並ぶ', () => {
      renderChart(new Array(6).fill({ waste: 0 }));

      expect(chart.data.map((d) => d.week)).toEqual([
        'W1',
        'W2',
        'W3',
        'W4',
        'W5',
        'W6'
      ]);
    });
  });

  describe('ブロック数', () => {
    it('渡された件数をそのまま使う', () => {
      renderChart([
        { waste: 0, blocks: 7 },
        { waste: 0, blocks: 0 }
      ]);

      expect(chart.data.map((d) => d.blockCount)).toEqual([7, 0]);
    });
  });

  describe('2 時間未満しか使っていない月', () => {
    it('秒を分へ丸めてそのまま渡す', () => {
      // 150 秒 = 2.5 分 → 3 分（四捨五入）
      renderChart([{ waste: 150 }, { waste: 3600 }]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([3, 60]);
    });

    it('119 分は分表示のままにする（境界）', () => {
      renderChart([{ waste: 119 * 60 }]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([119]);
      expect(chart.wasteTickFormatter?.(119)).toBe('119m');
    });
  });

  describe('2 時間以上使った月', () => {
    it('120 分ちょうどから時間へ切り替える（境界）', () => {
      renderChart([{ waste: 120 * 60 }]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([2]);
      expect(chart.wasteTickFormatter?.(2)).toBe('2h');
    });

    it('他の週も同じ単位（時間）へそろえる', () => {
      renderChart([{ waste: 180 * 60 }, { waste: 30 * 60 }]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([3, 0.5]);
    });
  });

  describe('記録が無いとき', () => {
    it('空のデータを渡し、目盛りは分のままにする', () => {
      renderChart([]);

      expect(chart.data).toEqual([]);
      expect(chart.wasteTickFormatter?.(0)).toBe('0m');
    });
  });

  describe('ツールチップの表示', () => {
    it('分表示のときは分の値を時間と分に直して出す', () => {
      renderChart([{ waste: 60 * 60 }]);

      expect(chart.tooltipFormatter?.(90, 'wasteTime')).toEqual([
        '1h 30m',
        'wasteTime'
      ]);
    });

    it('時間表示のときは時間の値を時間と分に直して出す', () => {
      renderChart([{ waste: 180 * 60 }]);

      expect(chart.tooltipFormatter?.(1.5, 'wasteTime')).toEqual([
        '1h 30m',
        'wasteTime'
      ]);
    });

    it('ブロック数は件数のまま出す', () => {
      renderChart([{ waste: 0 }]);

      expect(chart.tooltipFormatter?.(4, 'blockCount')).toEqual([
        4,
        'blockedCount'
      ]);
    });
  });
});
