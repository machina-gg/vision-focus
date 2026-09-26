import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsExportBar } from './AnalyticsExportBar';
import { STORY_SITES, storyActivity } from '~/stories/mockActivity';
import type { BlockListRow } from '~/lib/siteSelectors';

const mockBlockList: BlockListRow[] = [
  {
    id: 'twitter.com',
    domain: 'twitter.com',
    createdAt: '2026-02-01T10:00:00Z',
    enabled: true,
    timeLimit: null
  }
];

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
    blockRows: mockBlockList,
    activity: storyActivity(),
    sites: STORY_SITES,
    onRefresh: async () => {},
    onReset: () => {}
  }
};

// データが無い場合（エクスポートボタンが無効化される）
export const Empty: Story = {
  args: {
    blockRows: [],
    activity: {},
    sites: [],
    onRefresh: async () => {},
    onReset: () => {}
  }
};
