import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsSummary } from './AnalyticsSummary';
import { daysAgoKey, mockActivity } from '~/stories/mockActivity';
import type { UnblockHistory } from '~/types/storage';

/** 今日から days 日前の時刻（解除履歴の日時は今日基準の相対で作る） */
const isoDaysAgo = (days: number): string =>
  new Date(`${daysAgoKey(days)}T12:00:00`).toISOString();

const mixedHistory: UnblockHistory = {
  sites: {
    'twitter.com': {
      domain: 'twitter.com',
      status: 'blocked',
      blockedAt: isoDaysAgo(3),
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    },
    'facebook.com': {
      domain: 'facebook.com',
      status: 'unblocked',
      blockedAt: isoDaysAgo(10),
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    },
    'reddit.com': {
      domain: 'reddit.com',
      status: 'unblocked',
      blockedAt: isoDaysAgo(40),
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    }
  }
};

// 解除日と解除後の時間は activity から出る（解除履歴の時間は読まない）
const mixedActivity = mockActivity([
  ['facebook.com', { seconds: 1800, unblocks: 1 }, 3],
  ['facebook.com', { seconds: 1800 }, 0],
  ['reddit.com', { seconds: 3600, unblocks: 1 }, 14],
  ['reddit.com', { seconds: 3600 }, 1]
]);

const meta = {
  title: 'Options/Analytics/AnalyticsSummary',
  component: AnalyticsSummary,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof AnalyticsSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

// ブロック中・解除済みが混在し、合計浪費時間も表示される場合
export const WithTrackedSites: Story = {
  args: {
    activity: mixedActivity,
    sites: ['twitter.com', 'facebook.com', 'reddit.com'],
    unblockHistory: mixedHistory,
    onReblock: () => {},
    onStopTracking: () => {}
  }
};

// 追跡サイトが無い場合（空状態）
export const NoTrackedSites: Story = {
  args: {
    activity: {},
    sites: [],
    unblockHistory: { sites: {} },
    onReblock: () => {},
    onStopTracking: () => {}
  }
};
