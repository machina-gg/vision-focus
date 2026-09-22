import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

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
  siteUnblockCounts: {},
  timeLimitUsage: {}
};

const emptyAnalytics: AnalyticsData = {
  dailyStats: {},
  siteTime: {},
  siteCategories: {},
  siteBlockCounts: {},
  siteUnblockCounts: {},
  timeLimitUsage: {}
};

const meta = {
  title: 'Options/Analytics/AnalyticsDateFilter',
  component: AnalyticsDateFilter,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
    analyticsData: mockAnalytics
  }
};

// データが無い場合
export const Empty: Story = {
  args: {
    analyticsData: emptyAnalytics
  }
};
