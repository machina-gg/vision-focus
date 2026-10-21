import React from 'react';

import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MonthlyTrendChart } from '../MonthlyTrendChart';

const chart = vi.hoisted(() => ({
  data: [] as { week: string; wasteTime: number; blockCount: number }[],
  allowDecimals: {} as Record<string, boolean | undefined>,
  wasteTickFormatter: undefined as ((value: number) => string) | undefined,
  tooltipFormatter: undefined as
    ((value: unknown, name: string) => unknown) | undefined
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
    tickFormatter,
    allowDecimals
  }: {
    yAxisId: string;
    allowDecimals?: boolean;
    tickFormatter?: (value: number) => string;
  }) => {
    chart.allowDecimals[yAxisId] = allowDecimals;
    if (yAxisId === 'waste') chart.wasteTickFormatter = tickFormatter;
    return null;
  },
  Tooltip: ({
    formatter
  }: {
    formatter: (value: unknown, name: string) => unknown;
  }) => {
    chart.tooltipFormatter = formatter;
    return null;
  },
  Bar: () => null,
  Line: () => null
}));

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
    it('秒を丸めずに分へ換算して渡す', () => {
      renderChart([{ waste: 150 }, { waste: 3600 }]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([2.5, 60]);
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

    it('1 分未満は秒で出す', () => {
      renderChart([{ waste: 45 }]);

      expect(chart.tooltipFormatter?.(0.75, 'wasteTime')).toEqual([
        '45s',
        'wasteTime'
      ]);
    });

    it('端数の秒は切り捨てる', () => {
      renderChart([{ waste: 3580 }]);

      expect(chart.tooltipFormatter?.(3580 / 60, 'wasteTime')).toEqual([
        '59m',
        'wasteTime'
      ]);
    });

    it('小さい値でも縦軸の目盛りを整数にする', () => {
      renderChart([{ waste: 45 }]);

      expect(chart.allowDecimals).toEqual({ waste: false, block: false });
    });

    it('ブロック数は件数のまま出す', () => {
      renderChart([{ waste: 0 }]);

      expect(chart.tooltipFormatter?.(4, 'blockCount')).toEqual([
        4,
        'blockedCount'
      ]);
    });

    it('値が数値でなければ行を出さない（null を返す）', () => {
      renderChart([{ waste: 0 }]);

      expect(chart.tooltipFormatter?.('90', 'wasteTime')).toBeNull();
      expect(chart.tooltipFormatter?.(undefined, 'blockCount')).toBeNull();
    });
  });
});
