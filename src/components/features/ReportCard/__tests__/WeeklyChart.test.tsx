import React from 'react';

import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { WeeklyChart } from '../WeeklyChart';

/**
 * WeeklyChart が組み立てるグラフ用データと単位の切り替えの検査
 *
 * 秒で持っている無駄時間を分へ丸め、一番多い日が 2 時間以上なら時間表示へ
 * 切り替える。曜日ラベルと日別ブロック数は別々の配列から来るため、
 * 長さが揃っていないときの埋め方（フォールバック）も見る。
 *
 * グラフ本体は recharts に任せており jsdom では寸法が 0 で描画されないため、
 * 受け取った props を読める形に差し替えて「何を渡したか」を見る。
 */

const chart = vi.hoisted(() => ({
  data: [] as { day: string; wasteTime: number; blockCount: number }[],
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

/** 秒で持つ無駄時間から dailyBreakdown を作る */
const breakdownOf = (wasteSeconds: number[]) =>
  wasteSeconds.map((wasteTime) => ({ wasteTime, blockCount: 0 }));

const renderChart = (wasteSeconds: number[], blockCounts: number[] = []) =>
  render(
    <WeeklyChart
      dailyBreakdown={breakdownOf(wasteSeconds)}
      dailyBlockCounts={blockCounts}
    />
  );

beforeEach(() => {
  chart.data = [];
  chart.wasteTickFormatter = undefined;
  chart.tooltipFormatter = undefined;
});

describe('WeeklyChart', () => {
  describe('曜日ラベル', () => {
    it('7 日分には月曜から日曜までを順に付ける', () => {
      renderChart(new Array(7).fill(0));

      expect(chart.data.map((d) => d.day)).toEqual([
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat',
        'sun'
      ]);
    });

    it('7 日を超えた分は通し番号で埋める', () => {
      renderChart(new Array(9).fill(0));

      expect(chart.data.map((d) => d.day).slice(7)).toEqual(['D8', 'D9']);
    });
  });

  describe('日別のブロック数', () => {
    it('渡された数をそのまま使う', () => {
      renderChart([0, 0, 0], [3, 1, 4]);

      expect(chart.data.map((d) => d.blockCount)).toEqual([3, 1, 4]);
    });

    it('日数より少ないときは足りない分を 0 にする', () => {
      renderChart([0, 0, 0], [3]);

      expect(chart.data.map((d) => d.blockCount)).toEqual([3, 0, 0]);
    });
  });

  describe('2 時間未満しか使っていない週', () => {
    it('秒を分へ丸めてそのまま渡す', () => {
      // 150 秒 = 2.5 分 → 3 分（四捨五入）
      renderChart([150, 3600]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([3, 60]);
    });

    it('目盛りを分で表示する', () => {
      renderChart([3600]);

      expect(chart.wasteTickFormatter?.(60)).toBe('60m');
    });

    it('119 分は分表示のままにする（境界）', () => {
      renderChart([119 * 60]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([119]);
      expect(chart.wasteTickFormatter?.(119)).toBe('119m');
    });
  });

  describe('2 時間以上使った週', () => {
    it('120 分ちょうどから時間へ切り替える（境界）', () => {
      renderChart([120 * 60]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([2]);
      expect(chart.wasteTickFormatter?.(2)).toBe('2h');
    });

    it('他の日も同じ単位（時間）へそろえる', () => {
      renderChart([180 * 60, 30 * 60]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([3, 0.5]);
    });
  });

  describe('記録が無いとき', () => {
    it('空のデータを渡し、目盛りは分のままにする', () => {
      renderChart([]);

      expect(chart.data).toEqual([]);
      expect(chart.wasteTickFormatter?.(0)).toBe('0m');
    });

    it('すべて 0 秒でも 0 分として並べる', () => {
      renderChart([0, 0]);

      expect(chart.data.map((d) => d.wasteTime)).toEqual([0, 0]);
    });
  });

  describe('ツールチップの表示', () => {
    it('分表示のときは分の値を時間と分に直して出す', () => {
      renderChart([60 * 60]);

      expect(chart.tooltipFormatter?.(90, 'wasteTime')).toEqual([
        '1h 30m',
        'wasteTime'
      ]);
    });

    it('時間表示のときは時間の値を時間と分に直して出す', () => {
      renderChart([180 * 60]);

      expect(chart.tooltipFormatter?.(1.5, 'wasteTime')).toEqual([
        '1h 30m',
        'wasteTime'
      ]);
    });

    it('ブロック数は件数のまま出す', () => {
      renderChart([0]);

      expect(chart.tooltipFormatter?.(4, 'blockCount')).toEqual([
        4,
        'blockedCount'
      ]);
    });
  });
});
