import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { AnalyticsDateFilter } from './AnalyticsDateFilter';
import type { AnalyticsData } from '~/types/storage';

const mockAnalytics: AnalyticsData = {
  dailyStats: {
    '2026-02-09': {
      date: '2026-02-09',
      wasteTime: 3600,
      investTime: 7200,
      blockCount: 5,
      unblockCount: 0
    },
    '2026-02-10': {
      date: '2026-02-10',
      wasteTime: 4200,
      investTime: 6800,
      blockCount: 8,
      unblockCount: 0
    },
    '2026-02-11': {
      date: '2026-02-11',
      wasteTime: 3000,
      investTime: 8000,
      blockCount: 3,
      unblockCount: 0
    },
    '2026-02-12': {
      date: '2026-02-12',
      wasteTime: 5400,
      investTime: 9200,
      blockCount: 12,
      unblockCount: 0
    },
    '2026-02-13': {
      date: '2026-02-13',
      wasteTime: 2400,
      investTime: 6400,
      blockCount: 4,
      unblockCount: 0
    },
    '2026-02-14': {
      date: '2026-02-14',
      wasteTime: 4800,
      investTime: 7600,
      blockCount: 9,
      unblockCount: 0
    },
    '2026-02-15': {
      date: '2026-02-15',
      wasteTime: 3300,
      investTime: 7000,
      blockCount: 6,
      unblockCount: 0
    }
  },
  siteTime: {},
  siteCategories: {},
  siteBlockCounts: {},
  siteUnblockCounts: {}
};

const emptyAnalytics: AnalyticsData = {
  dailyStats: {},
  siteTime: {},
  siteCategories: {},
  siteBlockCounts: {},
  siteUnblockCounts: {}
};

const meta = {
  title: 'Options/Analytics/AnalyticsDateFilter',
  component: AnalyticsDateFilter,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  // 設定画面の本文と同じ幅（max-w-6xl）で、全幅表示のレポートを確かめる
  decorators: [
    (Story) => (
      <div className="max-w-6xl mx-auto">
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof AnalyticsDateFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

// 週次・月次データがある場合
export const WithData: Story = {
  args: {
    analyticsData: mockAnalytics,
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};

// 月次のタブを選んだ場合
export const MonthlyTab: Story = {
  args: {
    analyticsData: mockAnalytics,
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('tab-report-monthly'));
  }
};

// データが無い場合
export const Empty: Story = {
  args: {
    analyticsData: emptyAnalytics,
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};

// 支援の案内を出さない場合
export const WithoutSupportPrompt: Story = {
  args: {
    analyticsData: mockAnalytics,
    isSupportPromptVisible: false,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};
