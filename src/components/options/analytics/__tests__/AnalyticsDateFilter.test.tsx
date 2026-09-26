import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnalyticsDateFilter } from '../AnalyticsDateFilter';
import { generateWeeklyReport, generateMonthlyReport } from '~/lib/report';
import { DEFAULT_ANALYTICS } from '~/types/analytics';

/**
 * AnalyticsDateFilter が持つ「どの期間を見ているか」と、支援誘導の出し分けの検査
 *
 * 遡った回数（オフセット）をレポート生成へ渡し、未来へは進ませないこと、
 * 週と月のオフセットが互いに影響しないことを確かめる。週次と月次はタブで切り替え、
 * 選んだ方だけを表示し、切り替えても見ていた期間を保つことも見る。レポートの中身の描画は
 * WeeklyReportCard / MonthlyReportCard の責務なので、ここでは渡す値だけを見る。
 *
 * 支援誘導は出すかどうかの判定を親から受け取るので、受け取った値どおりに
 * 場所ごと出し入れすることと、操作がそのまま親へ返ることを見る。
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
    <div data-testid="weekly-report-card">
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
    <div data-testid="monthly-report-card">
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
  SupportPrompt: (props: {
    onSupport: () => Promise<void>;
    onDismiss: () => Promise<void>;
  }) => (
    <div data-testid="support-prompt">
      <button
        data-testid="support-prompt-support"
        onClick={() => void props.onSupport()}
      >
        支援する
      </button>
      <button
        data-testid="support-prompt-dismiss"
        onClick={() => void props.onDismiss()}
      >
        閉じる
      </button>
    </div>
  )
}));

/** 直近の呼び出しでレポート生成へ渡ったオフセット */
const lastWeeklyOffset = () =>
  vi.mocked(generateWeeklyReport).mock.lastCall?.[1];
const lastMonthlyOffset = () =>
  vi.mocked(generateMonthlyReport).mock.lastCall?.[1];

const click = (testId: string) => fireEvent.click(screen.getByTestId(testId));

const showWeekly = () => click('tab-report-weekly');
const showMonthly = () => click('tab-report-monthly');

const onSupport = vi.fn(async () => undefined);
const onDismissSupport = vi.fn(async () => undefined);

type FilterProps = Parameters<typeof AnalyticsDateFilter>[0];

function renderFilter(props: Partial<FilterProps> = {}) {
  return render(
    <AnalyticsDateFilter
      analyticsData={DEFAULT_ANALYTICS}
      isSupportPromptVisible={true}
      onSupport={onSupport}
      onDismissSupport={onDismissSupport}
      {...props}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnalyticsDateFilter', () => {
  describe('最初に開いたとき', () => {
    it('今週・今月のレポートを作る', () => {
      renderFilter();

      expect(generateWeeklyReport).toHaveBeenCalledWith(DEFAULT_ANALYTICS, 0);
      expect(generateMonthlyReport).toHaveBeenCalledWith(DEFAULT_ANALYTICS, 0);
    });

    it('進行中として表示し、次の期間へは進ませない', () => {
      renderFilter();

      expect(screen.getByTestId('weekly-is-current')).toHaveTextContent('true');
      expect(screen.getByTestId('weekly-can-go-next')).toHaveTextContent(
        'false'
      );

      showMonthly();

      expect(screen.getByTestId('monthly-is-current')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('monthly-can-go-next')).toHaveTextContent(
        'false'
      );
    });

    it('見出しを出す', () => {
      renderFilter();

      expect(screen.getByTestId('analytics-reports-heading')).toHaveTextContent(
        'reportsSection'
      );
    });
  });

  describe('週次と月次の切り替え', () => {
    it('最初は週次だけを表示する', () => {
      renderFilter();

      expect(screen.getByTestId('weekly-report-card')).toBeInTheDocument();
      expect(
        screen.queryByTestId('monthly-report-card')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('tab-report-weekly')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('月次のタブを選ぶと月次だけを表示する', () => {
      renderFilter();

      showMonthly();

      expect(screen.getByTestId('monthly-report-card')).toBeInTheDocument();
      expect(
        screen.queryByTestId('weekly-report-card')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('tab-report-monthly')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('タブを行き来しても見ていた週と月を保つ', () => {
      renderFilter();

      click('weekly-previous');
      click('weekly-previous');
      showMonthly();
      click('monthly-previous');
      showWeekly();

      expect(lastWeeklyOffset()).toBe(-2);
      expect(screen.getByTestId('weekly-can-go-next')).toHaveTextContent(
        'true'
      );

      showMonthly();

      expect(lastMonthlyOffset()).toBe(-1);
      expect(screen.getByTestId('monthly-is-current')).toHaveTextContent(
        'false'
      );
    });
  });

  describe('週の移動', () => {
    it('前の週へ戻るとオフセットが 1 つ減る', () => {
      renderFilter();

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
      renderFilter();

      click('weekly-previous');
      click('weekly-previous');
      click('weekly-next');

      expect(lastWeeklyOffset()).toBe(-1);
    });

    it('今週より先へは進まない', () => {
      renderFilter();

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
      renderFilter();
      showMonthly();

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
      renderFilter();
      showMonthly();

      click('monthly-next');

      expect(lastMonthlyOffset()).toBe(0);
    });
  });

  describe('週と月の独立', () => {
    it('週を戻しても月のオフセットは変わらない', () => {
      renderFilter();

      click('weekly-previous');
      showMonthly();

      expect(lastMonthlyOffset()).toBe(0);
      expect(screen.getByTestId('monthly-is-current')).toHaveTextContent(
        'true'
      );
    });

    it('月を戻しても週のオフセットは変わらない', () => {
      renderFilter();
      showMonthly();

      click('monthly-previous');
      showWeekly();

      expect(lastWeeklyOffset()).toBe(0);
      expect(screen.getByTestId('weekly-is-current')).toHaveTextContent('true');
    });
  });

  describe('支援の案内', () => {
    it('出すと渡されたら案内を置く', () => {
      renderFilter({ isSupportPromptVisible: true });

      expect(screen.getByTestId('support-prompt')).toBeInTheDocument();
    });

    it('出さないと渡されたら案内ごと置かない', () => {
      renderFilter({ isSupportPromptVisible: false });

      expect(screen.queryByTestId('support-prompt')).not.toBeInTheDocument();
    });

    it('支援の操作をそのまま親へ返す', () => {
      renderFilter();

      click('support-prompt-support');

      expect(onSupport).toHaveBeenCalledTimes(1);
      expect(onDismissSupport).not.toHaveBeenCalled();
    });

    it('閉じる操作をそのまま親へ返す', () => {
      renderFilter();

      click('support-prompt-dismiss');

      expect(onDismissSupport).toHaveBeenCalledTimes(1);
      expect(onSupport).not.toHaveBeenCalled();
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

      renderFilter({ analyticsData });

      expect(vi.mocked(generateWeeklyReport).mock.lastCall?.[0]).toBe(
        analyticsData
      );
    });
  });
});
