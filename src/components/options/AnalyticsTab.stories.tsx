import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { AnalyticsTab } from './AnalyticsTab';
import { SettingsProvider } from '~/contexts/SettingsContext';
import type { UnblockHistory, AnalyticsData } from '~/types/storage';

const mockUnblockHistory: UnblockHistory = {
  sites: {
    'reddit.com': {
      domain: 'reddit.com',
      status: 'blocked',
      blockedAt: '2026-02-12T09:00:00Z',
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    },
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
      timeAfterUnblock: 2400,
      lastActivity: '2026-02-15T12:00:00Z'
    },
    'facebook.com': {
      domain: 'facebook.com',
      status: 'blocked',
      blockedAt: '2026-02-14T15:00:00Z',
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    }
  }
};

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
      wasteTime: 2400,
      investTime: 6800,
      blockCount: 3,
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
      time: 2400,
      category: 'waste',
      lastUpdated: '2026-02-15T12:00:00Z'
    }
  },
  siteCategories: {
    'twitter.com': 'waste',
    'youtube.com': 'waste'
  },
  siteBlockCounts: {
    'twitter.com': {
      domain: 'twitter.com',
      count: 5,
      lastBlocked: '2026-02-15T10:00:00Z'
    },
    'youtube.com': {
      domain: 'youtube.com',
      count: 3,
      lastBlocked: '2026-02-15T11:00:00Z'
    }
  },
  siteUnblockCounts: {
    'twitter.com': {
      domain: 'twitter.com',
      count: 2,
      lastUnblocked: '2026-02-10T10:00:00Z'
    },
    'youtube.com': {
      domain: 'youtube.com',
      count: 1,
      lastUnblocked: '2026-02-11T14:30:00Z'
    }
  },
  timeLimitUsage: {
    'youtube.com': {
      domain: 'youtube.com',
      dailyUsedSeconds: 1200,
      hourlyUsedSeconds: 300,
      lastDailyReset: '2026-02-15',
      lastHourlyReset: '2026-02-15-12'
    }
  }
};

const meta = {
  title: 'Options/AnalyticsTab',
  component: AnalyticsTab,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <SettingsProvider>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Story />
        </div>
      </SettingsProvider>
    )
  ]
} satisfies Meta<typeof AnalyticsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FreeTier: Story = {
  args: {
    unblockHistory: mockUnblockHistory,
    analyticsData: mockAnalytics,
    isPremium: false,
    onReblock: (domain) => alert(`Reblock: ${domain}`),
    onReset: () => alert('Reset analytics'),
    onStopTracking: (domain) => alert(`Stop tracking: ${domain}`),
    onRefresh: async () => alert('Refresh'),
    onAddSite: (domain) => alert(`Add site: ${domain}`)
  }
};

export const Premium: Story = {
  args: {
    unblockHistory: mockUnblockHistory,
    analyticsData: mockAnalytics,
    isPremium: true,
    onReblock: (domain) => alert(`Reblock: ${domain}`),
    onReset: () => alert('Reset analytics'),
    onStopTracking: (domain) => alert(`Stop tracking: ${domain}`),
    onRefresh: async () => alert('Refresh'),
    onAddSite: (domain) => alert(`Add site: ${domain}`)
  }
};

export const Empty: Story = {
  args: {
    unblockHistory: { sites: {} },
    analyticsData: {
      dailyStats: {},
      siteTime: {},
      siteCategories: {},
      siteBlockCounts: {},
      siteUnblockCounts: {},
      timeLimitUsage: {}
    },
    isPremium: false,
    onReblock: () => {},
    onReset: () => {},
    onStopTracking: () => {},
    onRefresh: async () => {},
    onAddSite: () => {}
  }
};
