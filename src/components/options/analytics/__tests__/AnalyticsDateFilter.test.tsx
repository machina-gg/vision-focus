import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnalyticsDateFilter } from '../AnalyticsDateFilter';
import { generateWeeklyReport, generateMonthlyReport } from '~/lib/report';
import { DEFAULT_ANALYTICS } from '~/types/analytics';

/**
 * AnalyticsDateFilter が持つ「どの期間を見ているか」の検査
 *
 * 遡った回数（オフセット）をレポート生成へ渡し、未来へは進ませないこと、
 * 週と月のオフセットが互いに影響しないことを確かめる。レポートの中身の描画は
 * WeeklyReportCard / MonthlyReportCard の責務なので、ここでは渡す値だけを見る。
 */

vi.mock('~/lib/report', () => ({
  generateWeeklyReport: vi.fn(() => null),
  generateMonthlyReport: vi.fn(() => null)
}));

// レポートカードは受け取った props を読める形に差し替える
// （中の recharts は jsdom で寸法が 0 になり描画されないため）
vi.mock('~/components/features', () => ({
  WeeklyReportCard: (props: {
    onPrevious: () => void;
    onNext: () => void;
    canGoNext: boolean;
    isCurrentWeek: boolean;
  }) => (
    <div>
      <button data-testid="weekly-previous" onClick={props.onPrevious}>
        前の週
      </button>
      <button data-testid="weekly-next" onClick={props.onNext}>
        次の週
      </button>
      <span data-testid="weekly-can-go-next">{String(props.canGoNext)}</span>
      <span data-testid="weekly-is-current">{String(props.isCurrentWeek)}</span>
    </div>
  ),
  MonthlyReportCard: (props: {
    onPrevious: () => void;
    onNext: () => void;
    canGoNext: boolean;
    isCurrentMonth: boolean;
  }) => (
    <div>
      <button data-testid="monthly-previous" onClick={props.onPrevious}>
        前の月
      </button>
      <button data-testid="monthly-next" onClick={props.onNext}>
        次の月
      </button>
      <span data-testid="monthly-can-go-next">{String(props.canGoNext)}</span>
      <span data-testid="monthly-is-current">
        {String(props.isCurrentMonth)}
      </span>
    </div>
  ),
  SupportPrompt: () => <div data-testid="support-prompt" />
}));

/** 直近の呼び出しでレポート生成へ渡ったオフセット */
const lastWeeklyOffset = () =>
  vi.mocked(generateWeeklyReport).mock.lastCall?.[1];
const lastMonthlyOffset = () =>
  vi.mocked(generateMonthlyReport).mock.lastCall?.[1];

const click = (testId: string) => fireEvent.click(screen.getByTestId(testId));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnalyticsDateFilter', () => {
  describe('最初に開いたとき', () => {
    it('今週・今月のレポートを作る', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      expect(generateWeeklyReport).toHaveBeenCalledWith(DEFAULT_ANALYTICS, 0);
      expect(generateMonthlyReport).toHaveBeenCalledWith(DEFAULT_ANALYTICS, 0);
    });

    it('進行中として表示し、次の期間へは進ませない', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      expect(screen.getByTestId('weekly-is-current')).toHaveTextContent('true');
      expect(screen.getByTestId('weekly-can-go-next')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('monthly-is-current')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('monthly-can-go-next')).toHaveTextContent(
        'false'
      );
    });

    it('見出しと支援の案内を出す', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      expect(screen.getByTestId('analytics-reports-heading')).toHaveTextContent(
        'reportsSection'
      );
      expect(screen.getByTestId('support-prompt')).toBeInTheDocument();
    });
  });

  describe('週の移動', () => {
    it('前の週へ戻るとオフセットが 1 つ減る', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      click('weekly-previous');

      expect(lastWeeklyOffset()).toBe(-1);
      expect(screen.getByTestId('weekly-is-current')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('weekly-can-go-next')).toHaveTextContent(
        'true'
      );
    });

    it('戻った分だけ次の週へ進める', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      click('weekly-previous');
      click('weekly-previous');
      click('weekly-next');

      expect(lastWeeklyOffset()).toBe(-1);
    });

    it('今週より先へは進まない', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      click('weekly-next');
      click('weekly-next');

      expect(lastWeeklyOffset()).toBe(0);
      expect(screen.getByTestId('weekly-can-go-next')).toHaveTextContent(
        'false'
      );
    });
  });

  describe('月の移動', () => {
    it('前の月へ戻るとオフセットが 1 つ減る', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      click('monthly-previous');

      expect(lastMonthlyOffset()).toBe(-1);
      expect(screen.getByTestId('monthly-is-current')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('monthly-can-go-next')).toHaveTextContent(
        'true'
      );
    });

    it('今月より先へは進まない', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      click('monthly-next');

      expect(lastMonthlyOffset()).toBe(0);
    });
  });

  describe('週と月の独立', () => {
    it('週を戻しても月のオフセットは変わらない', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      click('weekly-previous');

      expect(lastMonthlyOffset()).toBe(0);
      expect(screen.getByTestId('monthly-is-current')).toHaveTextContent(
        'true'
      );
    });

    it('月を戻しても週のオフセットは変わらない', () => {
      render(<AnalyticsDateFilter analyticsData={DEFAULT_ANALYTICS} />);

      click('monthly-previous');

      expect(lastWeeklyOffset()).toBe(0);
      expect(screen.getByTestId('weekly-is-current')).toHaveTextContent('true');
    });
  });

  describe('渡された集計データ', () => {
    it('そのままレポート生成へ渡す', () => {
      const analyticsData = {
        ...DEFAULT_ANALYTICS,
        dailyStats: {
          '2026-03-09': {
            date: '2026-03-09',
            wasteTime: 600,
            investTime: 0,
            blockCount: 1,
            unblockCount: 0
          }
        }
      };

      render(<AnalyticsDateFilter analyticsData={analyticsData} />);

      expect(vi.mocked(generateWeeklyReport).mock.lastCall?.[0]).toBe(
        analyticsData
      );
    });
  });
});
