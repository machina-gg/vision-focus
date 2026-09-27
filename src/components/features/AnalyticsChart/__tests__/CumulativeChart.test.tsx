import React from 'react';

import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CumulativeChart } from '../CumulativeChart';

const chart = vi.hoisted(() => ({
  tooltipFormatter: undefined as ((value: unknown) => unknown) | undefined
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: ({ formatter }: { formatter: (value: unknown) => unknown }) => {
    chart.tooltipFormatter = formatter;
    return null;
  },
  Bar: () => null
}));

const renderChart = (minutes: number[]) =>
  render(
    <CumulativeChart
      data={minutes.map((value, index) => ({
        date: `2026-03-0${index + 1}`,
        cumulative: value
      }))}
    />
  );

beforeEach(() => {
  chart.tooltipFormatter = undefined;
});

describe('CumulativeChart のツールチップ', () => {
  it('分表示のときは分の値を時間と分に直して出す', () => {
    renderChart([60]);

    expect(chart.tooltipFormatter?.(90)).toEqual([
      '1h 30m',
      'chartCumulativeLabel'
    ]);
  });

  it('時間表示のときは時間の値を分に戻して出す', () => {
    renderChart([180]);

    expect(chart.tooltipFormatter?.(1.5)).toEqual([
      '1h 30m',
      'chartCumulativeLabel'
    ]);
  });

  it('値が数値でなければ行を出さない（null を返す）', () => {
    renderChart([60]);

    expect(chart.tooltipFormatter?.('90')).toBeNull();
    expect(chart.tooltipFormatter?.(undefined)).toBeNull();
  });
});
