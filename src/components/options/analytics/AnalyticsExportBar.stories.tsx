import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsExportBar } from './AnalyticsExportBar';
import type {
  AnalyticsData,
  AppSettings,
  UnblockHistory
} from '~/types/storage';

const mockSettings: AppSettings = {
  blockList: [
    {
      id: '1',
      domain: 'twitter.com',
      isWildcard: false,
      createdAt: '2026-02-01T10:00:00Z',
      enabled: true,
      timeLimit: null
    }
  ],
  schedules: [],
  paused: false,
  notifications: {
    timeLimitEnabled: true,
    timeLimitMinutes: 5
  },
  password: {
    enabled: false,
    passwordHash: null
  },
  unblockConfirm: { holdSeconds: 5 },
  youtube: {
    enabled: false,
    blockAccess: false,
    hideShorts: false,
    hideRecommendations: false,
    hideComments: false,
    hideHomeFeed: false,
    timeLimit: null
  }
};

const mockAnalytics: AnalyticsData = {
  dailyStats: {
    '2026-02-15': {
      date: '2026-02-15',
      wasteTime: 3600,
      investTime: 7200,
      blockCount: 5,
      unblockCount: 0
    }
  },
  siteTime: {},
  siteCategories: {},
  siteBlockCounts: {
    'twitter.com': {
      domain: 'twitter.com',
      count: 5,
      lastBlocked: '2026-02-15T10:00:00Z'
    }
  },
  siteUnblockCounts: {},
  timeLimitUsage: {}
};

const mockUnblockHistory: UnblockHistory = {
  sites: {
    'twitter.com': {
      domain: 'twitter.com',
      status: 'unblocked',
      blockedAt: '2026-02-08T10:00:00Z',
      unblockedAt: '2026-02-10T10:00:00Z',
      timeAfterUnblock: 3600,
      lastActivity: '2026-02-15T12:00:00Z'
    }
  }
};

const emptyAnalytics: AnalyticsData = {
  dailyStats: {},
  siteTime: {},
  siteCategories: {},
  siteBlockCounts: {},
  siteUnblockCounts: {},
  timeLimitUsage: {}
};

const emptyUnblockHistory: UnblockHistory = { sites: {} };

const meta = {
  title: 'Options/Analytics/AnalyticsExportBar',
  component: AnalyticsExportBar,
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
} satisfies Meta<typeof AnalyticsExportBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// エクスポート可能なデータがある場合
export const WithData: Story = {
  args: {
    settings: mockSettings,
    analyticsData: mockAnalytics,
    unblockHistory: mockUnblockHistory,
    onRefresh: async () => {},
    onReset: () => {}
  }
};

// データが無い場合（エクスポートボタンが無効化される）
export const Empty: Story = {
  args: {
    settings: null,
    analyticsData: emptyAnalytics,
    unblockHistory: emptyUnblockHistory,
    onRefresh: async () => {},
    onReset: () => {}
  }
};
