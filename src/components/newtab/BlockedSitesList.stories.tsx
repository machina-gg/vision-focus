import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { BlockedSitesList } from './BlockedSitesList';
import type { BlockItem, SiteBlockCount } from '~/types/storage';

const mockBlockList: BlockItem[] = [
  {
    id: '1',
    domain: 'twitter.com',
    isWildcard: false,
    enabled: true,
    timeLimit: null
  },
  {
    id: '2',
    domain: 'youtube.com',
    isWildcard: false,
    enabled: true,
    timeLimit: null
  },
  {
    id: '3',
    domain: 'reddit.com',
    isWildcard: false,
    enabled: true,
    timeLimit: null
  },
  {
    id: '4',
    domain: 'facebook.com',
    isWildcard: false,
    enabled: true,
    timeLimit: null
  },
  {
    id: '5',
    domain: 'instagram.com',
    isWildcard: false,
    enabled: true,
    timeLimit: null
  },
  {
    id: '6',
    domain: 'tiktok.com',
    isWildcard: false,
    enabled: true,
    timeLimit: null
  }
];

const mockBlockCounts: Record<string, SiteBlockCount> = {
  'twitter.com': {
    domain: 'twitter.com',
    count: 15,
    lastBlocked: '2026-02-15T10:00:00Z'
  },
  'youtube.com': {
    domain: 'youtube.com',
    count: 8,
    lastBlocked: '2026-02-15T11:00:00Z'
  },
  'reddit.com': {
    domain: 'reddit.com',
    count: 23,
    lastBlocked: '2026-02-15T12:00:00Z'
  },
  'facebook.com': {
    domain: 'facebook.com',
    count: 5,
    lastBlocked: '2026-02-15T13:00:00Z'
  },
  'instagram.com': {
    domain: 'instagram.com',
    count: 12,
    lastBlocked: '2026-02-15T14:00:00Z'
  },
  'tiktok.com': {
    domain: 'tiktok.com',
    count: 7,
    lastBlocked: '2026-02-15T15:00:00Z'
  }
};

const meta = {
  title: 'Newtab/BlockedSitesList',
  component: BlockedSitesList,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#1f2937' }]
    }
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof BlockedSitesList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    blockList: mockBlockList,
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};

export const Empty: Story = {
  args: {
    blockList: [],
    blockCounts: {},
    maxVisible: 5
  }
};

export const FewSites: Story = {
  args: {
    blockList: mockBlockList.slice(0, 3),
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};

export const NoCounts: Story = {
  args: {
    blockList: mockBlockList,
    blockCounts: {},
    maxVisible: 5
  }
};

export const WithDisabled: Story = {
  args: {
    blockList: [
      ...mockBlockList,
      {
        id: '7',
        domain: 'disabled-site.com',
        isWildcard: false,
        enabled: false,
        timeLimit: null
      }
    ],
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};
