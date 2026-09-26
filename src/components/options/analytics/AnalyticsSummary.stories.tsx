import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsSummary } from './AnalyticsSummary';
import type { UnblockHistory } from '~/types/storage';

const mixedHistory: UnblockHistory = {
  sites: {
    'twitter.com': {
      domain: 'twitter.com',
      status: 'blocked',
      blockedAt: '2026-02-12T09:00:00Z',
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    },
    'facebook.com': {
      domain: 'facebook.com',
      status: 'unblocked',
      blockedAt: '2026-02-05T08:00:00Z',
      unblockedAt: '2026-02-12T16:30:00Z',
      timeAfterUnblock: 3600,
      lastActivity: '2026-02-14T12:00:00Z'
    },
    'reddit.com': {
      domain: 'reddit.com',
      status: 'unblocked',
      blockedAt: '2026-01-15T09:00:00Z',
      unblockedAt: '2026-02-01T18:00:00Z',
      timeAfterUnblock: 7200,
      lastActivity: '2026-02-15T10:30:00Z'
    }
  }
};

const emptyHistory: UnblockHistory = { sites: {} };

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
    unblockHistory: mixedHistory,
    onReblock: () => {},
    onStopTracking: () => {}
  }
};

// 追跡サイトが無い場合（空状態）
export const NoTrackedSites: Story = {
  args: {
    unblockHistory: emptyHistory,
    onReblock: () => {},
    onStopTracking: () => {}
  }
};
