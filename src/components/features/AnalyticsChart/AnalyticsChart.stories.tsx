import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { AnalyticsChart } from './AnalyticsChart';
import type { AnalyticsData, UnblockHistory } from '~/types/storage';

const mockAnalytics: AnalyticsData = {
  dailyStats: {
    '2026-02-10': {
      date: '2026-02-10',
      wasteTime: 3600,
      investTime: 7200,
      blockCount: 5,
      unblockCount: 0
    },
    '2026-02-11': {
      date: '2026-02-11',
      wasteTime: 4200,
      investTime: 6800,
      blockCount: 8,
      unblockCount: 0
    },
    '2026-02-12': {
      date: '2026-02-12',
      wasteTime: 3000,
      investTime: 8000,
      blockCount: 3,
      unblockCount: 0
    },
    '2026-02-13': {
      date: '2026-02-13',
      wasteTime: 5400,
      investTime: 9200,
      blockCount: 12,
      unblockCount: 0
    },
    '2026-02-14': {
      date: '2026-02-14',
      wasteTime: 2400,
      investTime: 6400,
      blockCount: 4,
      unblockCount: 0
    },
    '2026-02-15': {
      date: '2026-02-15',
      wasteTime: 4800,
      investTime: 7600,
      blockCount: 9,
      unblockCount: 0
    }
  },
  siteTime: {
    'twitter.com': {
      domain: 'twitter.com',
      time: 3600,
      category: 'waste',
      lastUpdated: '2026-02-15T12:00:00Z'
    },
    'youtube.com': {
      domain: 'youtube.com',
      time: 3600,
      category: 'waste',
      lastUpdated: '2026-02-15T12:00:00Z'
    },
    'reddit.com': {
      domain: 'reddit.com',
      time: 1800,
      category: 'waste',
      lastUpdated: '2026-02-15T12:00:00Z'
    }
  },
  siteCategories: {
    'twitter.com': 'waste',
    'youtube.com': 'waste',
    'reddit.com': 'waste'
  },
  siteBlockCounts: {},
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
    },
    'youtube.com': {
      domain: 'youtube.com',
      status: 'unblocked',
      blockedAt: '2026-02-09T10:00:00Z',
      unblockedAt: '2026-02-11T14:30:00Z',
      timeAfterUnblock: 3600,
      lastActivity: '2026-02-15T12:00:00Z'
    },
    'reddit.com': {
      domain: 'reddit.com',
      status: 'unblocked',
      blockedAt: '2026-02-10T10:00:00Z',
      unblockedAt: '2026-02-12T09:15:00Z',
      timeAfterUnblock: 1800,
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

const emptyUnblockHistory: UnblockHistory = {
  sites: {}
};

const meta = {
  title: 'Features/AnalyticsChart',
  component: AnalyticsChart,
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
} satisfies Meta<typeof AnalyticsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DailyView: Story = {
  args: {
    analytics: mockAnalytics,
    unblockHistory: mockUnblockHistory,
    disabled: false
  }
};

export const Empty: Story = {
  args: {
    analytics: emptyAnalytics,
    unblockHistory: emptyUnblockHistory,
    disabled: false
  }
};

export const Disabled: Story = {
  args: {
    analytics: mockAnalytics,
    unblockHistory: mockUnblockHistory,
    disabled: true
  }
};

export const SingleSite: Story = {
  args: {
    analytics: {
      dailyStats: {
        '2026-02-15': {
          date: '2026-02-15',
          wasteTime: 7200,
          investTime: 3600,
          blockCount: 15,
          unblockCount: 0
        }
      },
      siteTime: {
        'twitter.com': {
          domain: 'twitter.com',
          time: 7200,
          category: 'waste',
          lastUpdated: '2026-02-15T12:00:00Z'
        }
      },
      siteCategories: { 'twitter.com': 'waste' },
      siteBlockCounts: {},
      siteUnblockCounts: {},
      timeLimitUsage: {}
    },
    unblockHistory: {
      sites: {
        'twitter.com': {
          domain: 'twitter.com',
          status: 'unblocked',
          blockedAt: '2026-02-14T08:00:00Z',
          unblockedAt: '2026-02-15T08:00:00Z',
          timeAfterUnblock: 7200,
          lastActivity: '2026-02-15T12:00:00Z'
        }
      }
    },
    disabled: false
  }
};
