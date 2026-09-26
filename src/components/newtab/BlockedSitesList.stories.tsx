import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockedSitesList } from './BlockedSitesList';
import type { BlockListRow } from '~/lib/siteSelectors';

const mockBlockList: BlockListRow[] = [
  {
    id: '1',
    domain: 'twitter.com',
    createdAt: '2026-02-10T10:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '2',
    domain: 'youtube.com',
    createdAt: '2026-02-10T11:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '3',
    domain: 'reddit.com',
    createdAt: '2026-02-10T12:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '4',
    domain: 'facebook.com',
    createdAt: '2026-02-10T13:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '5',
    domain: 'instagram.com',
    createdAt: '2026-02-10T14:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '6',
    domain: 'tiktok.com',
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
    blockRows: mockBlockList,
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};

export const Empty: Story = {
  args: {
    blockRows: [],
    blockCounts: {},
    maxVisible: 5
  }
};

export const FewSites: Story = {
  args: {
    blockRows: mockBlockList.slice(0, 3),
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};

export const NoCounts: Story = {
  args: {
    blockRows: mockBlockList,
    blockCounts: {},
    maxVisible: 5
  }
};

export const WithDisabled: Story = {
  args: {
    blockRows: [
      ...mockBlockList,
      {
        id: '7',
        domain: 'disabled-site.com',
        createdAt: '2026-02-10T16:00:00Z',
        enabled: false,
        timeLimit: null
      }
    ],
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};
