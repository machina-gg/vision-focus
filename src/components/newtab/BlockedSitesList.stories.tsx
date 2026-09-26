import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockedSitesList } from './BlockedSitesList';
import type { BlockItem } from '~/types/storage';

const mockBlockList: BlockItem[] = [
  {
    id: '1',
    domain: 'twitter.com',
    isWildcard: false,
    createdAt: '2026-02-10T10:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '2',
    domain: 'youtube.com',
    isWildcard: false,
    createdAt: '2026-02-10T11:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '3',
    domain: 'reddit.com',
    isWildcard: false,
    createdAt: '2026-02-10T12:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '4',
    domain: 'facebook.com',
    isWildcard: false,
    createdAt: '2026-02-10T13:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '5',
    domain: 'instagram.com',
    isWildcard: false,
    createdAt: '2026-02-10T14:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '6',
    domain: 'tiktok.com',
    isWildcard: false,
    createdAt: '2026-02-10T15:00:00Z',
    enabled: true,
    timeLimit: null
  }
];

const mockBlockCounts: Record<string, number> = {
  'twitter.com': 15,
  'youtube.com': 8,
  'reddit.com': 23,
  'facebook.com': 5,
  'instagram.com': 12,
  'tiktok.com': 7
};

const meta = {
  title: 'Newtab/BlockedSitesList',
  component: BlockedSitesList,
  parameters: {
    layout: 'centered'
  },
  globals: {
    backgrounds: { value: 'dark' }
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
        createdAt: '2026-02-10T16:00:00Z',
        enabled: false,
        timeLimit: null
      }
    ],
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};
