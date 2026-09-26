import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { WeeklyReportCard, MonthlyReportCard } from './ReportCard';
import type { WeeklyReport, MonthlyReport } from '~/types/report';

const mockWeeklyReport: WeeklyReport = {
  weekStart: '2026-02-09',
  weekEnd: '2026-02-15',
  totalWasteTime: 18000,
  totalBlockCount: 42,
  totalUnblockCount: 6,
  dailyBreakdown: [
    {
      date: '2026-02-09',
      wasteTime: 1800,
      investTime: 3600,
      blockCount: 3,
      unblockCount: 0
    },
    {
      date: '2026-02-10',
      wasteTime: 3600,
      investTime: 4200,
      blockCount: 8,
      unblockCount: 1
    },
    {
      date: '2026-02-11',
      wasteTime: 2400,
      investTime: 5400,
      blockCount: 5,
      unblockCount: 0
    },
    {
      date: '2026-02-12',
      wasteTime: 4200,
      investTime: 3000,
      blockCount: 9,
      unblockCount: 2
    },
    {
      date: '2026-02-13',
      wasteTime: 1200,
      investTime: 6000,
      blockCount: 4,
      unblockCount: 0
    },
    {
      date: '2026-02-14',
      wasteTime: 3000,
      investTime: 2400,
      blockCount: 7,
      unblockCount: 1
    },
    {
      date: '2026-02-15',
      wasteTime: 1800,
      investTime: 4800,
      blockCount: 6,
      unblockCount: 2
    }
  ],
  dailyBlockCounts: [3, 8, 5, 9, 4, 7, 6],
  topWasteSites: [
    { domain: 'twitter.com', time: 7200 },
    { domain: 'youtube.com', time: 5400 },
    { domain: 'reddit.com', time: 1800 }
  ],
  topBlockedSites: [
    { domain: 'twitter.com', count: 12 },
    { domain: 'youtube.com', count: 8 },
    { domain: 'reddit.com', count: 5 }
  ],
  topUnblockedSites: [{ domain: 'twitter.com', count: 3 }],
  wasteTimeChangePercent: -12.4,
  trend: 'improving'
};

const mockMonthlyReport: MonthlyReport = {
  month: '2026-02',
  totalWasteTime: 72000,
  totalBlockCount: 160,
  totalUnblockCount: 20,
  weeklyBreakdown: [
    {
      weekStart: '2026-02-02',
      wasteTime: 14400,
      blockCount: 30,
      unblockCount: 4
    },
    {
      weekStart: '2026-02-09',
      wasteTime: 18000,
      blockCount: 42,
      unblockCount: 6
    },
    {
      weekStart: '2026-02-16',
      wasteTime: 21600,
      blockCount: 48,
      unblockCount: 5
    },
    {
      weekStart: '2026-02-23',
      wasteTime: 18000,
      blockCount: 40,
      unblockCount: 5
    }
  ],
  topWasteSites: [
    { domain: 'twitter.com', time: 28800 },
    { domain: 'youtube.com', time: 21600 },
    { domain: 'reddit.com', time: 14400 }
  ],
  topBlockedSites: [
    { domain: 'twitter.com', count: 60 },
    { domain: 'youtube.com', count: 45 },
    { domain: 'reddit.com', count: 30 }
  ],
  topUnblockedSites: [{ domain: 'twitter.com', count: 10 }],
  wasteTimeChangePercent: 8.1,
  trend: 'declining'
};

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
