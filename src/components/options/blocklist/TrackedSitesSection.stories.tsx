import type { Meta, StoryObj } from '@storybook/react';

import { TrackedSitesSection } from './TrackedSitesSection';

const meta = {
  title: 'Options/Blocklist/TrackedSitesSection',
  component: TrackedSitesSection,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TrackedSitesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// 追跡サイトが複数ある場合
export const WithMultipleSites: Story = {
  args: {
    unblockHistory: {
      sites: {
        'twitter.com': {
          domain: 'twitter.com',
          status: 'blocked',
          blockedAt: '2026-02-10T10:00:00Z',
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
          status: 'blocked',
          blockedAt: '2026-02-08T14:00:00Z',
          unblockedAt: null,
          timeAfterUnblock: 0,
          lastActivity: null
        },
        'youtube.com': {
          domain: 'youtube.com',
          status: 'unblocked',
          blockedAt: '2026-01-15T09:00:00Z',
          unblockedAt: '2026-02-01T18:00:00Z',
          timeAfterUnblock: 7200,
          lastActivity: '2026-02-15T10:30:00Z'
        }
      }
    }
  }
};

// すべてブロック中の場合
export const AllBlocked: Story = {
  args: {
    unblockHistory: {
      sites: {
        'twitter.com': {
          domain: 'twitter.com',
          status: 'blocked',
          blockedAt: '2026-02-10T10:00:00Z',
          unblockedAt: null,
          timeAfterUnblock: 0,
          lastActivity: null
        },
        'facebook.com': {
          domain: 'facebook.com',
          status: 'blocked',
          blockedAt: '2026-02-12T15:00:00Z',
          unblockedAt: null,
          timeAfterUnblock: 0,
          lastActivity: null
        }
      }
    }
  }
};

// すべてブロック解除済みの場合
export const AllUnblocked: Story = {
  args: {
    unblockHistory: {
      sites: {
        'twitter.com': {
          domain: 'twitter.com',
          status: 'unblocked',
          blockedAt: '2026-01-10T10:00:00Z',
          unblockedAt: '2026-02-10T15:00:00Z',
          timeAfterUnblock: 5400,
          lastActivity: '2026-02-15T12:00:00Z'
        },
        'facebook.com': {
          domain: 'facebook.com',
          status: 'unblocked',
          blockedAt: '2026-01-05T08:00:00Z',
          unblockedAt: '2026-02-01T09:00:00Z',
          timeAfterUnblock: 10800,
          lastActivity: '2026-02-14T14:30:00Z'
        }
      }
    }
  }
};

// 追跡サイトがない場合（null の場合はレンダリングしない）
export const NoTrackedSites: Story = {
  args: {
    unblockHistory: {
      sites: {}
    }
  }
};
