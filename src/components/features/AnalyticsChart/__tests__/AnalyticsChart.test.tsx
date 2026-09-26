import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AnalyticsChart, CHART_DAYS } from '../AnalyticsChart';
import type { ActivityLog } from '~/types/activity';
import type { SiteKey } from '~/types/site';
import { stubI18nWithSubstitutions } from '~/test/i18n';

stubI18nWithSubstitutions();

vi.mock('../DailyChart', () => ({
  DailyChart: ({ data }: { data: unknown }) => (
    <div data-testid="daily-chart">{JSON.stringify(data)}</div>
  )
}));
vi.mock('../BySiteChart', () => ({
  BySiteChart: ({ data }: { data: unknown }) => (
    <div data-testid="by-site-chart">{JSON.stringify(data)}</div>
  )
}));
vi.mock('../CumulativeChart', () => ({
  CumulativeChart: ({ data }: { data: unknown }) => (
    <div data-testid="cumulative-chart">{JSON.stringify(data)}</div>
  )
}));

const NOW = new Date(2026, 2, 10, 12);
// 直近 14 日の初日
const FIRST_DAY = '2026-02-25';

const seconds = (value: number) => ({ seconds: value, blocks: 0, unblocks: 0 });

function renderChart(
  activity: ActivityLog,
  sites: readonly SiteKey[],
  disabled = false
) {
  return render(
    <AnalyticsChart activity={activity} sites={sites} disabled={disabled} />
  );
}

const switchTo = (messageKey: string) =>
  fireEvent.click(screen.getByRole('button', { name: messageKey }));

const pressedTexts = () =>
  screen
    .getAllByRole('button')
    .filter((el) => el.getAttribute('aria-pressed') === 'true')
    .map((el) => el.textContent);

function chartData<T>(testId: string): T[] {
  return JSON.parse(screen.getByTestId(testId).textContent ?? '[]') as T[];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// 期間の外（初日の前日）と母集団の外（untracked.com）を混ぜてある
const activity: ActivityLog = {
  '2026-02-24': { 'a.example': seconds(99_999) },
  [FIRST_DAY]: { 'a.example': seconds(600) },
  '2026-03-01': {
    'a.example': seconds(1200),
    'b.example': seconds(3000),
    'untracked.com': seconds(50_000)
  },
  '2026-03-10': { 'b.example': seconds(600) }
};
const sites = ['a.example', 'b.example'];

describe('AnalyticsChart', () => {
  describe('合計の表示', () => {
    it('直近 14 日・追跡中のサイトの合計時間と件数を出す', () => {
      renderChart(activity, sites);

      expect(
        screen.getByText(`totalTimeOnTrackedSites(${CHART_DAYS})`)
      ).toBeInTheDocument();
      // 600 + 1200 + 3000 + 600 = 5400 秒
      expect(screen.getByText('1h 30m')).toBeInTheDocument();
      expect(screen.getByText('chartSiteCount(2)')).toBeInTheDocument();
    });

    it('追跡中のサイトが無くても例外にならず 0 件と出す', () => {
      renderChart(activity, []);

      expect(screen.getByText('0s')).toBeInTheDocument();
      expect(screen.getByText('chartSiteCount(0)')).toBeInTheDocument();
    });
  });

  describe('3 系列と見出しの合計は同じ期間から出る', () => {
    it('日別の和 = サイト別の和 = 累積の最後 = 見出しの合計（分）', () => {
      renderChart(activity, sites);
      const daily = chartData<{ time: number }>('daily-chart');
      switchTo('chartTypeBySite');
      const bySite = chartData<{ time: number }>('by-site-chart');
      switchTo('chartTypeCumulative');
      const cumulative = chartData<{ cumulative: number }>('cumulative-chart');

      const totalMinutes = 5400 / 60;
      expect(daily.reduce((acc, d) => acc + d.time, 0)).toBe(totalMinutes);
      expect(bySite.reduce((acc, d) => acc + d.time, 0)).toBe(totalMinutes);
      expect(cumulative[cumulative.length - 1].cumulative).toBe(totalMinutes);
    });
  });

  describe('グラフの切り替え', () => {
    it('最初は日次グラフを出す', () => {
      renderChart({}, []);

      expect(screen.getByTestId('daily-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('by-site-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cumulative-chart')).not.toBeInTheDocument();
    });

    it('サイト別に切り替えられる', () => {
      renderChart({}, []);

      switchTo('chartTypeBySite');

      expect(screen.getByTestId('by-site-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('daily-chart')).not.toBeInTheDocument();
    });

    it('累積に切り替えられる', () => {
      renderChart({}, []);

      switchTo('chartTypeCumulative');

      expect(screen.getByTestId('cumulative-chart')).toBeInTheDocument();
    });

    it('最初は日次のボタンだけが押下状態になる', () => {
      renderChart({}, []);

      expect(pressedTexts()).toEqual(['chartTypeDaily']);
    });

    it('切り替えると押下状態も移る', () => {
      renderChart({}, []);

      switchTo('chartTypeCumulative');

      expect(pressedTexts()).toEqual(['chartTypeCumulative']);
    });

    it('日次へ戻せる', () => {
      renderChart({}, []);

      switchTo('chartTypeBySite');
      switchTo('chartTypeDaily');

      expect(screen.getByTestId('daily-chart')).toBeInTheDocument();
    });
  });

  describe('日次グラフのデータ', () => {
    it('期間の全日を古い順に並べ、事実の無い日は 0 分', () => {
      renderChart(activity, sites);
      const daily = chartData<{ date: string; time: number }>('daily-chart');

      expect(daily).toHaveLength(CHART_DAYS);
      expect(daily[0]).toEqual({ date: FIRST_DAY, time: 10 });
      expect(daily[1]).toEqual({ date: '2026-02-26', time: 0 });
      expect(daily.find((d) => d.date === '2026-03-01')).toEqual({
        date: '2026-03-01',
        time: 70
      });
      expect(daily[CHART_DAYS - 1]).toEqual({ date: '2026-03-10', time: 10 });
    });

    it('期間内に表示時間が無ければ空にする（データなしを出す）', () => {
      renderChart({ '2026-02-24': { 'a.example': seconds(600) } }, sites);

      expect(chartData('daily-chart')).toEqual([]);
    });
  });

  describe('サイト別グラフのデータ', () => {
    it('期間内の時間の多い順に並べ、秒を分へ丸める', () => {
      renderChart(activity, sites);
      switchTo('chartTypeBySite');

      expect(chartData('by-site-chart')).toEqual([
        { domain: 'b.example', fullDomain: 'b.example', time: 60 },
        { domain: 'a.example', fullDomain: 'a.example', time: 30 }
      ]);
    });

    it('15 文字を超えるドメインは表示用に切り詰め、元の値も残す', () => {
      const long = 'very-long-domain-name.example';
      renderChart({ '2026-03-10': { [long]: seconds(600) } }, [long]);
      switchTo('chartTypeBySite');

      expect(chartData('by-site-chart')).toEqual([
        { domain: 'very-long-domai...', fullDomain: long, time: 10 }
      ]);
    });

    it('上位 8 件までにする', () => {
      const many = Array.from({ length: 10 }, (_, i) => `site${i}.example`);
      const log: ActivityLog = {
        '2026-03-10': Object.fromEntries(
          many.map((site, i) => [site, seconds((i + 1) * 60)])
        )
      };
      renderChart(log, many);
      switchTo('chartTypeBySite');

      const bySite = chartData<{ fullDomain: string }>('by-site-chart');
      expect(bySite).toHaveLength(8);
      expect(bySite[0].fullDomain).toBe('site9.example');
    });
  });

  describe('累積グラフのデータ', () => {
    it('期間の初日から日ごとに足し上げて分で出す', () => {
      renderChart(activity, sites);
      switchTo('chartTypeCumulative');
      const cumulative = chartData<{ date: string; cumulative: number }>(
        'cumulative-chart'
      );

      expect(cumulative).toHaveLength(CHART_DAYS);
      expect(cumulative[0]).toEqual({ date: FIRST_DAY, cumulative: 10 });
      expect(cumulative.find((d) => d.date === '2026-03-01')).toEqual({
        date: '2026-03-01',
        cumulative: 80
      });
    });

    it('期間内に表示時間が無ければ空にする', () => {
      renderChart({}, sites);
      switchTo('chartTypeCumulative');

      expect(chartData('cumulative-chart')).toEqual([]);
    });
  });

  describe('disabled のとき', () => {
    it('切り替えのボタンをすべて押せなくする', () => {
      renderChart({}, [], true);

      screen.getAllByRole('button').forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('キーボードから届いてもグラフは切り替わらない', () => {
      renderChart({}, [], true);

      // 包む div の pointer-events はマウスしか止めないため、無効の属性が無いとこの押下でグラフが切り替わる
      switchTo('chartTypeBySite');

      expect(screen.getByTestId('daily-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('by-site-chart')).not.toBeInTheDocument();
    });

    it('disabled を渡さなければ押せる', () => {
      renderChart({}, [], false);

      screen.getAllByRole('button').forEach((button) => {
        expect(button).toBeEnabled();
      });
    });
  });
});
