import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsExportBar } from './AnalyticsExportBar';
import { STORY_SITES, storyActivity } from '~/stories/mockActivity';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';

// twitter.com だけブロックリストにあり、残りは追跡だけ
const mockSites = sitesOf(
  blockedSite('twitter.com'),
  ...STORY_SITES.filter((site) => site !== 'twitter.com').map((site) =>
    trackedSite(site)
  )
);

const meta = {
  title: 'Options/Analytics/AnalyticsExportBar',
  component: AnalyticsExportBar,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof AnalyticsExportBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// エクスポート可能なデータがある場合
export const WithData: Story = {
  args: {
    activity: storyActivity(),
    trackedSites: mockSites,
    onRefresh: async () => {},
    onReset: () => {}
  }
};

// データが無い場合（エクスポートボタンが無効化される）
export const Empty: Story = {
  args: {
    activity: {},
    trackedSites: {},
    onRefresh: async () => {},
    onReset: () => {}
  }
};
