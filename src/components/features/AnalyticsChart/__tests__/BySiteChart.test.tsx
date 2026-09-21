import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BySiteChart } from '../BySiteChart';
import type { BySiteChartData } from '../BySiteChart';
import { SITE_COLORS } from '../chartUtils';

/**
 * BySiteChart の空表示と、グラフへ渡すデータ・色・ツールチップの検査
 *
 * グラフ本体は recharts に任せており jsdom では寸法が 0 で描画されないため、
 * 受け取った props を読める形に差し替えて「何を渡したか」を見る。
 *
 * 色はサイト数がパレットを超えたときに先頭へ戻す。ツールチップは短縮した
 * ドメインではなく元のドメインを出すため、その受け渡しも見る。
 */

const chart = vi.hoisted(() => ({
  data: undefined as BySiteChartData[] | undefined,
  cellFills: [] as (string | undefined)[],
  tooltipFormatter: undefined as
    | ((
        value: number,
        name: string,
        props?: { payload?: { fullDomain?: string } }
      ) => [string, string])
    | undefined
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  BarChart: ({
    data,
    children
  }: {
    data: BySiteChartData[];
    children: React.ReactNode;
  }) => {
    chart.data = data;
    return <div data-testid="bar-chart">{children}</div>;
  },
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: ({ fill }: { fill?: string }) => {
    chart.cellFills.push(fill);
    return null;
  },
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: ({ formatter }: { formatter: typeof chart.tooltipFormatter }) => {
    chart.tooltipFormatter = formatter;
    return null;
  }
}));

const dataOf = (entries: [string, number][]): BySiteChartData[] =>
  entries.map(([domain, time]) => ({
    domain,
    fullDomain: `www.${domain}`,
    time
  }));

beforeEach(() => {
  chart.data = undefined;
  chart.cellFills = [];
  chart.tooltipFormatter = undefined;
});

describe('BySiteChart', () => {
  describe('データが無いとき', () => {
    it('グラフの代わりにデータ無しの案内を出す', () => {
      render(<BySiteChart data={[]} />);

      expect(screen.getByText('noData')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  describe('データがあるとき', () => {
    it('受け取ったデータをそのままグラフへ渡す', () => {
      const data = dataOf([
        ['a.example', 30],
        ['b.example', 10]
      ]);

      render(<BySiteChart data={data} />);

      expect(chart.data).toEqual(data);
    });

    it('使用時間が 0 のサイトも落とさずに渡す', () => {
      render(<BySiteChart data={dataOf([['a.example', 0]])} />);

      expect(chart.data).toHaveLength(1);
      expect(chart.data?.[0].time).toBe(0);
    });
  });

  describe('色の割り当て', () => {
    it('サイトごとにパレットの色を順に当てる', () => {
      render(
        <BySiteChart
          data={dataOf([
            ['a.example', 3],
            ['b.example', 2]
          ])}
        />
      );

      expect(chart.cellFills).toEqual([SITE_COLORS[0], SITE_COLORS[1]]);
    });

    it('パレットの数を超えたら先頭の色へ戻す', () => {
      const data = dataOf(
        Array.from(
          { length: SITE_COLORS.length + 1 },
          (_, i) => [`site-${i}.example`, 1] as [string, number]
        )
      );

      render(<BySiteChart data={data} />);

      expect(chart.cellFills).toHaveLength(SITE_COLORS.length + 1);
      expect(chart.cellFills[SITE_COLORS.length]).toBe(SITE_COLORS[0]);
    });
  });

  describe('ツールチップ', () => {
    it('分を読める形に整形し、短縮前のドメインを添える', () => {
      render(<BySiteChart data={dataOf([['a.example', 90]])} />);

      expect(
        chart.tooltipFormatter?.(90, 'time', {
          payload: { fullDomain: 'www.a.example' }
        })
      ).toEqual(['1h 30m', 'www.a.example']);
    });

    it('1 時間未満は分だけで出す', () => {
      render(<BySiteChart data={dataOf([['a.example', 45]])} />);

      expect(
        chart.tooltipFormatter?.(45, 'time', {
          payload: { fullDomain: 'www.a.example' }
        })
      ).toEqual(['45m', 'www.a.example']);
    });

    it('元のドメインが無いときは空文字にして例外にしない', () => {
      render(<BySiteChart data={dataOf([['a.example', 10]])} />);

      expect(chart.tooltipFormatter?.(10, 'time', {})).toEqual(['10m', '']);
      expect(chart.tooltipFormatter?.(10, 'time')).toEqual(['10m', '']);
    });
  });
});
