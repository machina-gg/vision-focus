import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsTab } from './AnalyticsTab';
import { SettingsProvider } from '~/contexts/SettingsContext';
import { daysAgoKey, STORY_SITES, storyActivity } from '~/stories/mockActivity';
import { selectBlockList, selectTrackedSiteRows } from '~/lib/siteSelectors';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';

/** 今日から days 日前の時刻（ブロック開始日は今日基準の相対で作る） */
const isoDaysAgo = (days: number): string =>
  new Date(`${daysAgoKey(days)}T12:00:00`).toISOString();

// reddit.com / facebook.com はブロック中、twitter.com / youtube.com は追跡だけが続く
const trackedSites = sitesOf(
  blockedSite('reddit.com', { addedAt: isoDaysAgo(3) }),
  trackedSite('twitter.com'),
  trackedSite('youtube.com'),
  blockedSite('facebook.com', { addedAt: isoDaysAgo(1) })
);
const trackedSiteRows = selectTrackedSiteRows(trackedSites);
const blockRows = selectBlockList(trackedSites);

// 追跡中のサイト（facebook.com は例の activity に行が無い）
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
    blockRows,
    trackedSiteRows,
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
    blockRows,
    trackedSiteRows,
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
    blockRows: [],
    trackedSiteRows: [],
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
