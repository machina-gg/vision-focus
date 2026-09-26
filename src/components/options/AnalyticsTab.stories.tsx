import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsTab } from './AnalyticsTab';
import { SettingsProvider } from '~/contexts/SettingsContext';
import { daysAgoKey, storyActivity } from '~/stories/mockActivity';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';

/** 今日から days 日前の時刻（ブロック開始日は今日基準の相対で作る） */
const isoDaysAgo = (days: number): string =>
  new Date(`${daysAgoKey(days)}T12:00:00`).toISOString();

// reddit.com はブロック中、facebook.com はトグルで無効、twitter.com / youtube.com は追跡だけが続く
// （facebook.com は例の activity に行が無い）
const trackedSites = sitesOf(
  blockedSite('reddit.com', { addedAt: isoDaysAgo(3) }),
  trackedSite('twitter.com'),
  trackedSite('youtube.com'),
  blockedSite('facebook.com', { addedAt: isoDaysAgo(1), enabled: false })
);
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
    trackedSites,
    activity,
    onReblock: (site) => alert(`Reblock: ${site.domain}`),
    onReset: () => alert('Reset analytics'),
    onStopTracking: (site) => alert(`Stop tracking: ${site.domain}`),
    onRefresh: async () => alert('Refresh'),
    onAddSite: async (domain) => {
      alert(`Add site: ${domain}`);
      return true;
    },
    addSiteError: '',
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};

export const Premium: Story = {
  args: {
    trackedSites,
    activity,
    onReblock: (site) => alert(`Reblock: ${site.domain}`),
    onReset: () => alert('Reset analytics'),
    onStopTracking: (site) => alert(`Stop tracking: ${site.domain}`),
    onRefresh: async () => alert('Refresh'),
    onAddSite: async (domain) => {
      alert(`Add site: ${domain}`);
      return true;
    },
    addSiteError: '',
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};

// 入れ子の追跡サイトを追加しようとして拒否された状態
export const AddSiteRejected: Story = {
  args: {
    ...Premium.args,
    addSiteError:
      'm.twitter.com は追跡中の twitter.com に含まれるため追加できません'
  }
};

export const Empty: Story = {
  args: {
    trackedSites: {},
    activity: {},
    onReblock: () => {},
    onReset: () => {},
    onStopTracking: () => {},
    onRefresh: async () => {},
    onAddSite: async () => true,
    addSiteError: '',
    isSupportPromptVisible: false,
    onSupport: async () => {},
    onDismissSupport: async () => {}
  }
};
