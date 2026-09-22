import type { Meta, StoryObj } from '@storybook/react';

import { SiteRankingList } from './SiteRankingList';
import type { AnalyticsData } from '~/types/storage';

const mockAnalytics: AnalyticsData = {
  dailyStats: {},
  siteTime: {},
  siteCategories: {},
  siteBlockCounts: {
    'twitter.com': {
      domain: 'twitter.com',
      count: 42,
      lastBlocked: '2026-02-15T10:00:00Z'
    },
    'youtube.com': {
      domain: 'youtube.com',
      count: 18,
      lastBlocked: '2026-02-14T09:00:00Z'
    },
    'reddit.com': {
      domain: 'reddit.com',
      count: 7,
      lastBlocked: '2026-02-10T20:00:00Z'
    }
  },
  siteUnblockCounts: {
    'twitter.com': {
      domain: 'twitter.com',
      count: 3,
      lastUnblocked: '2026-02-14T08:00:00Z'
    }
  },
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
  title: 'Options/Analytics/SiteRankingList',
  component: SiteRankingList,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof SiteRankingList>;

export default meta;
type Story = StoryObj<typeof meta>;

// ブロック回数の多い順にランキング表示（解除回数バッジ付きのサイトあり）
export const WithRankedSites: Story = {
  args: {
    analyticsData: mockAnalytics
  }
};

// ランキングが無い場合（コンポーネントは何も描画しない）
export const Empty: Story = {
  args: {
    analyticsData: emptyAnalytics
  }
};
