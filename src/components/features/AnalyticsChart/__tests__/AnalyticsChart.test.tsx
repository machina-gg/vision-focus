import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AnalyticsChart } from '../AnalyticsChart';
import type {
  AnalyticsData,
  UnblockHistory,
  TrackedSite
} from '~/types/storage';
import { DEFAULT_ANALYTICS } from '~/types/analytics';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * AnalyticsChart が組み立てるグラフ用データと、表示するグラフの切り替えの検査
 *
 * 日次・サイト別・累積の 3 つは、どれも「集計が無いとき」に別の経路へ落ちる
 * （現在の合計を 1 点だけ出す / 空にする）。この境界と、秒から分への丸め・
 * 並び順・件数の上限を確かめる。
 *
 * グラフ本体は recharts に任せており jsdom では寸法が 0 で描画されないため、
 * 受け取ったデータを読める形に差し替えて「何を渡したか」を見る。
 */

// サイト件数が文言の置換値として表示に出るため、置換値の見える stub を使う
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

/** 「今日」の判定が現在時刻に依存するため、基準時刻を固定する */
const NOW = new Date('2026-03-10T12:00:00.000Z');
const TODAY = '2026-03-10';

const siteOf = (
  domain: string,
  timeAfterUnblock: number,
  unblockedAt: string | null = '2026-03-01T00:00:00.000Z'
): TrackedSite => ({
  domain,
  status: 'unblocked',
  blockedAt: '2026-02-01T00:00:00.000Z',
  unblockedAt,
  timeAfterUnblock,
  lastActivity: null
});

const historyOf = (sites: TrackedSite[]): UnblockHistory => ({
  sites: Object.fromEntries(sites.map((site) => [site.domain, site]))
});

const analyticsOf = (dailyStats: Record<string, number>): AnalyticsData => ({
  ...DEFAULT_ANALYTICS,
  dailyStats: Object.fromEntries(
    Object.entries(dailyStats).map(([date, wasteTime]) => [
      date,
      { date, wasteTime, investTime: 0, blockCount: 0, unblockCount: 0 }
    ])
  )
});

function renderChart(
  analytics: AnalyticsData,
  unblockHistory: UnblockHistory,
  disabled = false
) {
  return render(
    <AnalyticsChart
      analytics={analytics}
      unblockHistory={unblockHistory}
      disabled={disabled}
    />
  );
}

/** グラフの種類を切り替えるボタン（文言のキーで選ぶ） */
const switchTo = (messageKey: string) =>
  fireEvent.click(screen.getByRole('button', { name: messageKey }));

/** 押下状態になっているボタンの文言（選択中の印） */
const pressedTexts = () =>
  screen
    .getAllByRole('button')
    .filter((el) => el.getAttribute('aria-pressed') === 'true')
    .map((el) => el.textContent);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AnalyticsChart', () => {
  describe('合計の表示', () => {
    it('追跡中のサイトの合計時間と件数を出す', () => {
      renderChart(
        DEFAULT_ANALYTICS,
        historyOf([siteOf('a.example', 3600), siteOf('b.example', 600)])
      );

      expect(screen.getByText('totalTimeOnTrackedSites')).toBeInTheDocument();
      expect(screen.getByText('1h 10m')).toBeInTheDocument();
      expect(screen.getByText('chartSiteCount(2)')).toBeInTheDocument();
    });

    it('追跡中のサイトが無くても例外にならず 0 件と出す', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]));

      expect(screen.getByText('0s')).toBeInTheDocument();
      expect(screen.getByText('chartSiteCount(0)')).toBeInTheDocument();
    });
  });

  describe('グラフの切り替え', () => {
    it('最初は日次グラフを出す', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]));

      expect(screen.getByTestId('daily-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('by-site-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cumulative-chart')).not.toBeInTheDocument();
    });

    it('サイト別に切り替えられる', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]));

      switchTo('chartTypeBySite');

      expect(screen.getByTestId('by-site-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('daily-chart')).not.toBeInTheDocument();
    });

    it('累積に切り替えられる', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]));

      switchTo('chartTypeCumulative');

      expect(screen.getByTestId('cumulative-chart')).toBeInTheDocument();
    });

    it('最初は日次のボタンだけが押下状態になる', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]));

      expect(pressedTexts()).toEqual(['chartTypeDaily']);
    });

    it('切り替えると押下状態も移る', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]));

      switchTo('chartTypeCumulative');

      expect(pressedTexts()).toEqual(['chartTypeCumulative']);
    });

    it('日次へ戻せる', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]));

      switchTo('chartTypeBySite');
      switchTo('chartTypeDaily');

      expect(screen.getByTestId('daily-chart')).toBeInTheDocument();
    });
  });

  describe('日次グラフのデータ', () => {
    it('秒を分へ丸め、日付の古い順に並べる', () => {
      renderChart(
        analyticsOf({ '2026-03-09': 150, '2026-03-08': 600 }),
        historyOf([])
      );

      expect(screen.getByTestId('daily-chart')).toHaveTextContent(
        JSON.stringify([
          { date: '2026-03-08', time: 10 },
          { date: '2026-03-09', time: 3 }
        ])
      );
    });

    it('分に丸めて 0 になる日は出さない', () => {
      renderChart(
        analyticsOf({ '2026-03-09': 20, '2026-03-08': 600 }),
        historyOf([])
      );

      expect(screen.getByTestId('daily-chart')).toHaveTextContent(
        JSON.stringify([{ date: '2026-03-08', time: 10 }])
      );
    });

    it('直近 14 日分までにする', () => {
      const stats = Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [
          `2026-03-${String(i + 1).padStart(2, '0')}`,
          600
        ])
      );

      renderChart(analyticsOf(stats), historyOf([]));

      const data = JSON.parse(
        screen.getByTestId('daily-chart').textContent ?? '[]'
      ) as Array<{ date: string }>;
      expect(data).toHaveLength(14);
      expect(data[0].date).toBe('2026-03-07');
      expect(data[13].date).toBe('2026-03-20');
    });

    it('日別の集計が無ければ、今日の 1 点として現在の合計を出す', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([siteOf('a.example', 3600)]));

      expect(screen.getByTestId('daily-chart')).toHaveTextContent(
        JSON.stringify([{ date: TODAY, time: 60 }])
      );
    });

    it('日別の集計も合計も無ければ空にする', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([siteOf('a.example', 0)]));

      expect(screen.getByTestId('daily-chart')).toHaveTextContent('[]');
    });
  });

  describe('サイト別グラフのデータ', () => {
    it('時間の多い順に並べ、秒を分へ丸める', () => {
      renderChart(
        DEFAULT_ANALYTICS,
        historyOf([siteOf('small.example', 600), siteOf('big.example', 3600)])
      );

      switchTo('chartTypeBySite');

      expect(screen.getByTestId('by-site-chart')).toHaveTextContent(
        JSON.stringify([
          { domain: 'big.example', fullDomain: 'big.example', time: 60 },
          { domain: 'small.example', fullDomain: 'small.example', time: 10 }
        ])
      );
    });

    it('15 文字を超えるドメインは表示用に切り詰め、元の値も残す', () => {
      const long = 'very-long-domain-name.example';
      renderChart(DEFAULT_ANALYTICS, historyOf([siteOf(long, 600)]));

      switchTo('chartTypeBySite');

      expect(screen.getByTestId('by-site-chart')).toHaveTextContent(
        JSON.stringify([
          {
            domain: 'very-long-domai...',
            fullDomain: long,
            time: 10
          }
        ])
      );
    });

    it('時間が 0 分のサイトは出さない', () => {
      renderChart(
        DEFAULT_ANALYTICS,
        historyOf([siteOf('zero.example', 20), siteOf('some.example', 600)])
      );

      switchTo('chartTypeBySite');

      const chart = screen.getByTestId('by-site-chart');
      expect(chart).toHaveTextContent('some.example');
      expect(chart).not.toHaveTextContent('zero.example');
    });

    it('上位 8 件までにする', () => {
      renderChart(
        DEFAULT_ANALYTICS,
        historyOf(
          Array.from({ length: 10 }, (_, i) =>
            siteOf(`site${i}.example`, (i + 1) * 600)
          )
        )
      );

      switchTo('chartTypeBySite');

      const data = JSON.parse(
        screen.getByTestId('by-site-chart').textContent ?? '[]'
      ) as unknown[];
      expect(data).toHaveLength(8);
    });
  });

  describe('累積グラフのデータ', () => {
    it('追跡中のサイトが無ければ空にする', () => {
      renderChart(analyticsOf({ '2026-03-09': 600 }), historyOf([]));

      switchTo('chartTypeCumulative');

      expect(screen.getByTestId('cumulative-chart')).toHaveTextContent('[]');
    });

    it('日ごとの時間を足し上げて分で出す', () => {
      renderChart(
        analyticsOf({ '2026-03-08': 600, '2026-03-09': 1200 }),
        historyOf([siteOf('a.example', 1800)])
      );

      switchTo('chartTypeCumulative');

      expect(screen.getByTestId('cumulative-chart')).toHaveTextContent(
        JSON.stringify([
          { date: '2026-03-08', cumulative: 10 },
          { date: '2026-03-09', cumulative: 30 }
        ])
      );
    });

    it('解除より前の日は足し上げに含めない', () => {
      renderChart(
        analyticsOf({ '2026-02-01': 6000, '2026-03-08': 600 }),
        historyOf([siteOf('a.example', 600, '2026-03-01T00:00:00.000Z')])
      );

      switchTo('chartTypeCumulative');

      expect(screen.getByTestId('cumulative-chart')).toHaveTextContent(
        JSON.stringify([{ date: '2026-03-08', cumulative: 10 }])
      );
    });

    it('日別の集計が無ければ、今日の 1 点として現在の合計を出す', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([siteOf('a.example', 1800)]));

      switchTo('chartTypeCumulative');

      expect(screen.getByTestId('cumulative-chart')).toHaveTextContent(
        JSON.stringify([{ date: TODAY, cumulative: 30 }])
      );
    });

    it('日別の集計も合計も無ければ空にする', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([siteOf('a.example', 0)]));

      switchTo('chartTypeCumulative');

      expect(screen.getByTestId('cumulative-chart')).toHaveTextContent('[]');
    });
  });

  describe('disabled のとき', () => {
    it('切り替えのボタンをすべて押せなくする', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]), true);

      screen.getAllByRole('button').forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('キーボードから届いてもグラフは切り替わらない', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]), true);

      // ⚠ 包む div の pointer-events はマウスしか止めない。
      // 無効の属性が無いと、この押下でグラフが切り替わる
      switchTo('chartTypeBySite');

      expect(screen.getByTestId('daily-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('by-site-chart')).not.toBeInTheDocument();
    });

    it('disabled を渡さなければ押せる', () => {
      renderChart(DEFAULT_ANALYTICS, historyOf([]), false);

      screen.getAllByRole('button').forEach((button) => {
        expect(button).toBeEnabled();
      });
    });
  });
});
