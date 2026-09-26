import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockedSitesList } from './BlockedSitesList';
import { blockedSite, sitesOf } from '~/test/sites';
import type { TrackedSite } from '~/types/site';

const blockedAt = (
  domain: string,
  addedAt: string,
  enabled = true
): TrackedSite => blockedSite(domain, { addedAt, enabled });

const mockSites: TrackedSite[] = [
  blockedAt('twitter.com', '2026-02-10T10:00:00Z'),
  blockedAt('youtube.com', '2026-02-10T11:00:00Z'),
  blockedAt('reddit.com', '2026-02-10T12:00:00Z'),
  blockedAt('facebook.com', '2026-02-10T13:00:00Z'),
  blockedAt('instagram.com', '2026-02-10T14:00:00Z'),
  blockedAt('tiktok.com', '2026-02-10T15:00:00Z'),
  blockedAt('x.com', '2026-02-10T16:00:00Z')
];

const mockBlockCounts: Record<string, number> = {
  'twitter.com': 15,
  'youtube.com': 8,
  'reddit.com': 23,
  'facebook.com': 5,
  'instagram.com': 12,
  'tiktok.com': 7,
  'x.com': 4
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
    trackedSites: sitesOf(...mockSites),
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};

export const Empty: Story = {
  args: {
    trackedSites: {},
    blockCounts: {},
    maxVisible: 5
  }
};

export const FewSites: Story = {
  args: {
    trackedSites: sitesOf(...mockSites.slice(0, 3)),
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};

export const NoCounts: Story = {
  args: {
    trackedSites: sitesOf(...mockSites),
    blockCounts: {},
    maxVisible: 5
  }
};

export const WithDisabled: Story = {
  args: {
    trackedSites: sitesOf(
      ...mockSites,
      blockedAt('disabled-site.com', '2026-02-10T17:00:00Z', false)
    ),
    blockCounts: mockBlockCounts,
    maxVisible: 5
  }
};
