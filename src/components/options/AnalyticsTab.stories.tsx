import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsTab } from './AnalyticsTab';
import { SettingsProvider } from '~/contexts/SettingsContext';
import { daysAgoKey, STORY_SITES, storyActivity } from '~/stories/mockActivity';
import type { UnblockHistory } from '~/types/storage';

/** 今日から days 日前の時刻（解除履歴の日時は今日基準の相対で作る） */
const isoDaysAgo = (days: number): string =>
  new Date(`${daysAgoKey(days)}T12:00:00`).toISOString();

const mockUnblockHistory: UnblockHistory = {
  sites: {
    'reddit.com': {
      domain: 'reddit.com',
      status: 'blocked',
      blockedAt: isoDaysAgo(3),
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    },
    'twitter.com': {
      domain: 'twitter.com',
      status: 'unblocked',
      blockedAt: isoDaysAgo(7),
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    },
    'youtube.com': {
      domain: 'youtube.com',
      status: 'unblocked',
      blockedAt: isoDaysAgo(6),
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    },
    'facebook.com': {
      domain: 'facebook.com',
      status: 'blocked',
      blockedAt: isoDaysAgo(1),
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    }
  }
};

// 追跡中のサイト = 解除履歴のキー（facebook.com は例の activity に行が無い）
const sites = [...STORY_SITES, 'facebook.com'];
const activity = storyActivity();

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
    activity,
    sites,
    onReblock: (domain) => alert(`Reblock: ${domain}`),
    onReset: () => alert('Reset analytics'),
    onStopTracking: (domain) => alert(`Stop tracking: ${domain}`),
    onRefresh: async () => alert('Refresh'),
    onAddSite: (domain) => alert(`Add site: ${domain}`),
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};

export const Premium: Story = {
  args: {
    unblockHistory: mockUnblockHistory,
    activity,
    sites,
    onReblock: (domain) => alert(`Reblock: ${domain}`),
    onReset: () => alert('Reset analytics'),
    onStopTracking: (domain) => alert(`Stop tracking: ${domain}`),
    onRefresh: async () => alert('Refresh'),
    onAddSite: (domain) => alert(`Add site: ${domain}`),
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};

export const Empty: Story = {
  args: {
    unblockHistory: { sites: {} },
    activity: {},
    sites: [],
    onReblock: () => {},
    onReset: () => {},
    onStopTracking: () => {},
    onRefresh: async () => {},
    onAddSite: () => {},
    isSupportPromptVisible: false,
    onSupport: async () => {},
    onDismissSupport: async () => {}
  }
};
