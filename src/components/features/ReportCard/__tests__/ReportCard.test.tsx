import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { WeeklyReportCard, MonthlyReportCard } from '../ReportCard';
import type { WeeklyReport, MonthlyReport } from '~/types/report';

/**
 * WeeklyReportCard / MonthlyReportCard の表示分岐とコールバックの検査
 *
 * レポートが無いとき（集計対象の期間にデータが無い・遡りすぎた）に空表示へ
 * 落ちること、期間の表記へ渡す値、次の期間へ進めないときにボタンが効かないことを
 * 確かめる。期間の見出しは「進行中」の文言で区別できるため、強調の色は見ない。
 */

// 期間の表記はロケールと時差で変わるため、渡した値と表示の対応だけを見る
vi.mock('~/lib/report', () => ({
  formatWeekRange: vi.fn(
    (weekStart: string, weekEnd: string) => `週:${weekStart}〜${weekEnd}`
  ),
  formatMonth: vi.fn((month: string) => `月:${month}`)
}));

// グラフは recharts に任せており、jsdom では寸法が 0 で描画されない。
// カードの責務は「どのデータを渡すか」なので、渡った値を読める形に差し替える
vi.mock('../WeeklyChart', () => ({
  WeeklyChart: (props: Record<string, unknown>) => (
    <div data-testid="weekly-chart">{JSON.stringify(props)}</div>
  )
}));
vi.mock('../MonthlyTrendChart', () => ({
  MonthlyTrendChart: (props: Record<string, unknown>) => (
    <div data-testid="monthly-trend-chart">{JSON.stringify(props)}</div>
  )
}));

const weeklyReportOf = (
  overrides: Partial<WeeklyReport> = {}
): WeeklyReport => ({
  weekStart: '2026-03-09',
  weekEnd: '2026-03-15',
  totalWasteTime: 3660,
  totalBlockCount: 12,
  totalUnblockCount: 3,
  dailyBreakdown: [
    {
      date: '2026-03-09',
      wasteTime: 600,
      investTime: 0,
      blockCount: 2,
      unblockCount: 1
    }
  ],
  dailyBlockCounts: [2, 0, 0, 0, 0, 0, 0],
  topWasteSites: [{ domain: 'waste.example', time: 1200 }],
  topBlockedSites: [{ domain: 'blocked.example', count: 5 }],
  topUnblockedSites: [],
  wasteTimeChangePercent: -12.5,
  trend: 'improving',
  ...overrides
});

const monthlyReportOf = (
  overrides: Partial<MonthlyReport> = {}
): MonthlyReport => ({
  month: '2026-03',
  totalWasteTime: 7200,
  totalBlockCount: 40,
  totalUnblockCount: 8,
  weeklyBreakdown: [
    {
      weekStart: '2026-03-02',
      wasteTime: 1800,
      blockCount: 10,
      unblockCount: 2
    }
  ],
  topWasteSites: [{ domain: 'waste.example', time: 3600 }],
  topBlockedSites: [{ domain: 'blocked.example', count: 9 }],
  topUnblockedSites: [],
  wasteTimeChangePercent: null,
  trend: 'stable',
  ...overrides
});

/**
 * 期間を移動するボタン
 *
 * どちらもアイコンだけで名前を持たないため、描画順で取る
 * （0 = 前の期間へ、1 = 次の期間へ）
 */
const navButtons = () => screen.getAllByRole('button');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WeeklyReportCard', () => {
  const renderCard = (
    report: WeeklyReport | null,
    props: { canGoNext?: boolean; isCurrentWeek?: boolean } = {}
  ) => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const result = render(
      <WeeklyReportCard
        report={report}
        onPrevious={onPrevious}
        onNext={onNext}
        canGoNext={props.canGoNext ?? false}
        isCurrentWeek={props.isCurrentWeek}
      />
    );
    return { onPrevious, onNext, ...result };
  };

  describe('レポートが無いとき', () => {
    it('空表示の案内を出し、統計とグラフは出さない', () => {
      renderCard(null);

      expect(screen.getByText('noReportData')).toBeInTheDocument();
      expect(screen.queryByTestId('weekly-chart')).not.toBeInTheDocument();
      expect(screen.queryByText('wasteTime')).not.toBeInTheDocument();
    });

    it('期間の表記をプレースホルダにする', () => {
      renderCard(null);

      expect(screen.getByText('---')).toBeInTheDocument();
    });

    it('見出しは出したままにする', () => {
      renderCard(null);

      expect(screen.getByText('weeklyReport')).toBeInTheDocument();
    });
  });

  describe('レポートがあるとき', () => {
    it('レポートの開始日と終了日で期間を表記する', () => {
      renderCard(weeklyReportOf());

      expect(screen.getByText('週:2026-03-09〜2026-03-15')).toBeInTheDocument();
      expect(screen.queryByText('---')).not.toBeInTheDocument();
    });

    it('空表示の案内を出さない', () => {
      renderCard(weeklyReportOf());

      expect(screen.queryByText('noReportData')).not.toBeInTheDocument();
    });

    it('集計値とランキングを出す', () => {
      renderCard(weeklyReportOf());

      expect(screen.getByText('1h 1m')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('waste.example')).toBeInTheDocument();
      expect(screen.getByText('blocked.example')).toBeInTheDocument();
    });

    it.each([
      ['improving' as const, 'improving'],
      ['declining' as const, 'declining'],
      ['stable' as const, 'stable']
    ])('トレンドが %s なら %s と表示する', (trend, expected) => {
      renderCard(weeklyReportOf({ trend }));

      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it('日別の内訳とブロック回数をグラフへ渡す', () => {
      renderCard(weeklyReportOf());

      expect(screen.getByTestId('weekly-chart')).toHaveTextContent(
        JSON.stringify({
          dailyBreakdown: [{ wasteTime: 600, blockCount: 2 }],
          dailyBlockCounts: [2, 0, 0, 0, 0, 0, 0]
        })
      );
    });

    it('上位サイトが空でもデータ無しの案内を出す', () => {
      renderCard(weeklyReportOf({ topWasteSites: [], topBlockedSites: [] }));

      expect(screen.getAllByText('noData')).toHaveLength(2);
    });

    it('前の期間との比較が無ければその旨を出す', () => {
      renderCard(weeklyReportOf({ wasteTimeChangePercent: null }));

      expect(screen.getByText('noComparisonData')).toBeInTheDocument();
    });
  });

  describe('進行中の表示', () => {
    it('今週なら進行中の印を出す', () => {
      renderCard(weeklyReportOf(), { isCurrentWeek: true });

      expect(screen.getByText('inProgress')).toBeInTheDocument();
    });

    it('今週でなければ進行中の印を出さない', () => {
      renderCard(weeklyReportOf(), { isCurrentWeek: false });

      expect(screen.queryByText('inProgress')).not.toBeInTheDocument();
    });

    it('指定が無ければ進行中の印を出さない', () => {
      renderCard(weeklyReportOf());

      expect(screen.queryByText('inProgress')).not.toBeInTheDocument();
    });
  });

  describe('期間の移動', () => {
    it('前の週のボタンで onPrevious が呼ばれる', () => {
      const { onPrevious } = renderCard(weeklyReportOf());

      fireEvent.click(navButtons()[0]);

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it('次の週へ進めるときはボタンが効く', () => {
      const { onNext } = renderCard(weeklyReportOf(), { canGoNext: true });

      const next = navButtons()[1];
      expect(next).toBeEnabled();

      fireEvent.click(next);

      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('次の週へ進めないときはボタンを押せない', () => {
      const { onNext } = renderCard(weeklyReportOf(), { canGoNext: false });

      const next = navButtons()[1];
      expect(next).toBeDisabled();

      fireEvent.click(next);

      expect(onNext).not.toHaveBeenCalled();
    });

    it('レポートが無くても前の週へは戻れる', () => {
      const { onPrevious } = renderCard(null);

      fireEvent.click(navButtons()[0]);

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });
  });
});

describe('MonthlyReportCard', () => {
  const renderCard = (
    report: MonthlyReport | null,
    props: { canGoNext?: boolean; isCurrentMonth?: boolean } = {}
  ) => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const result = render(
      <MonthlyReportCard
        report={report}
        onPrevious={onPrevious}
        onNext={onNext}
        canGoNext={props.canGoNext ?? false}
        isCurrentMonth={props.isCurrentMonth}
      />
    );
    return { onPrevious, onNext, ...result };
  };

  describe('レポートが無いとき', () => {
    it('空表示の案内とプレースホルダを出す', () => {
      renderCard(null);

      expect(screen.getByText('monthlyReport')).toBeInTheDocument();
      expect(screen.getByText('noReportData')).toBeInTheDocument();
      expect(screen.getByText('---')).toBeInTheDocument();
      expect(
        screen.queryByTestId('monthly-trend-chart')
      ).not.toBeInTheDocument();
    });
  });

  describe('レポートがあるとき', () => {
    it('レポートの月で期間を表記する', () => {
      renderCard(monthlyReportOf());

      expect(screen.getByText('月:2026-03')).toBeInTheDocument();
    });

    it('集計値とランキングを出す', () => {
      renderCard(monthlyReportOf());

      expect(screen.getByText('2h 0m')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('waste.example')).toBeInTheDocument();
    });

    it('週ごとの内訳をグラフへ渡す', () => {
      const report = monthlyReportOf();
      renderCard(report);

      expect(screen.getByTestId('monthly-trend-chart')).toHaveTextContent(
        JSON.stringify({ weeklyBreakdown: report.weeklyBreakdown })
      );
    });

    it('前の期間との比較が無ければその旨を出す', () => {
      renderCard(monthlyReportOf());

      expect(screen.getByText('noComparisonData')).toBeInTheDocument();
    });

    it('比較があれば符号つきの変化率を出す', () => {
      renderCard(monthlyReportOf({ wasteTimeChangePercent: 12.34 }));

      expect(screen.getByText('+12.3%')).toBeInTheDocument();
    });
  });

  describe('進行中の表示', () => {
    it('今月なら進行中の印を出す', () => {
      renderCard(monthlyReportOf(), { isCurrentMonth: true });

      expect(screen.getByText('inProgress')).toBeInTheDocument();
    });

    it('今月でなければ進行中の印を出さない', () => {
      renderCard(monthlyReportOf(), { isCurrentMonth: false });

      expect(screen.queryByText('inProgress')).not.toBeInTheDocument();
    });
  });

  describe('期間の移動', () => {
    it('前の月のボタンで onPrevious が呼ばれる', () => {
      const { onPrevious } = renderCard(monthlyReportOf());

      fireEvent.click(navButtons()[0]);

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it('次の月へ進めないときはボタンを押せない', () => {
      const { onNext } = renderCard(monthlyReportOf(), { canGoNext: false });

      fireEvent.click(navButtons()[1]);

      expect(onNext).not.toHaveBeenCalled();
    });

    it('次の月へ進めるときは onNext が呼ばれる', () => {
      const { onNext } = renderCard(monthlyReportOf(), { canGoNext: true });

      fireEvent.click(navButtons()[1]);

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });
});
