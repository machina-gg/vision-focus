import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { WeeklyReportCard, MonthlyReportCard } from './ReportCard';
import { generateMonthlyReport, generateWeeklyReport } from '~/lib/report';
import { STORY_SITES, storyActivity } from '~/stories/mockActivity';

// 実際のレポート生成に例の activity を通す（合計・内訳・トップが同じ期間から出る形を見せる）。
// 期間は今日基準なので、例の activity も今日からの相対日付で作ってある
const activity = storyActivity();
const mockWeeklyReport = generateWeeklyReport(activity, STORY_SITES, 0);
const mockMonthlyReport = generateMonthlyReport(activity, STORY_SITES, 0);

const meta = {
  title: 'Features/ReportCard',
  component: WeeklyReportCard,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof WeeklyReportCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// 週次レポート: データがある場合
export const WeeklyWithData: Story = {
  args: {
    report: mockWeeklyReport,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: true
  }
};

// 週次レポート: 当該週が進行中の場合（バッジ表示・次へボタン無効）
export const WeeklyCurrentWeek: Story = {
  args: {
    report: mockWeeklyReport,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: false,
    isCurrentWeek: true
  }
};

// 週次レポート: データが無い場合
export const WeeklyEmpty: Story = {
  args: {
    report: null,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: true
  }
};

// 月次レポート: データがある場合（WeeklyReportCard とは別コンポーネントのため render で描画する）
export const MonthlyWithData: StoryObj<typeof MonthlyReportCard> = {
  render: (args) => <MonthlyReportCard {...args} />,
  args: {
    report: mockMonthlyReport,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: true
  }
};

// 月次レポート: データが無い場合
export const MonthlyEmpty: StoryObj<typeof MonthlyReportCard> = {
  render: (args) => <MonthlyReportCard {...args} />,
  args: {
    report: null,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: true
  }
};
