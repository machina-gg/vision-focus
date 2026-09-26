import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { WeeklyReportCard, MonthlyReportCard } from './ReportCard';
import { generateMonthlyReport, generateWeeklyReport } from '~/lib/report';
import { STORY_SITES, storyActivity } from '~/stories/mockActivity';

// レポートの期間は今日基準なので、例の activity も今日からの相対日付で作る
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

export const WeeklyWithData: Story = {
  args: {
    report: mockWeeklyReport,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: true
  }
};

export const WeeklyCurrentWeek: Story = {
  args: {
    report: mockWeeklyReport,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: false,
    isCurrentWeek: true
  }
};

export const WeeklyEmpty: Story = {
  args: {
    report: null,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: true
  }
};

export const MonthlyWithData: StoryObj<typeof MonthlyReportCard> = {
  render: (args) => <MonthlyReportCard {...args} />,
  args: {
    report: mockMonthlyReport,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: true
  }
};

export const MonthlyEmpty: StoryObj<typeof MonthlyReportCard> = {
  render: (args) => <MonthlyReportCard {...args} />,
  args: {
    report: null,
    onPrevious: () => {},
    onNext: () => {},
    canGoNext: true
  }
};
