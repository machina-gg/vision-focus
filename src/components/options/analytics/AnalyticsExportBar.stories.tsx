import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsExportBar } from './AnalyticsExportBar';
import { STORY_SITES, storyActivity } from '~/stories/mockActivity';
import type { AppSettings } from '~/types/storage';

const mockSettings: AppSettings = {
  blockList: [
    {
      id: '1',
      domain: 'twitter.com',
      isWildcard: false,
      createdAt: '2026-02-01T10:00:00Z',
      enabled: true,
      timeLimit: null
    }
  ],
  schedules: [],
  paused: false,
  notifications: {
    timeLimitEnabled: true,
    timeLimitMinutes: 5
  },
  password: {
    enabled: false,
    passwordHash: null
  },
  unblockConfirm: { holdSeconds: 5 },
  youtube: {
    enabled: false,
    blockAccess: false,
    hideShorts: false,
    hideRecommendations: false,
    hideComments: false,
    hideHomeFeed: false,
    timeLimit: null
  }
};

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
    settings: mockSettings,
    activity: storyActivity(),
    sites: STORY_SITES,
    onRefresh: async () => {},
    onReset: () => {}
  }
};

// データが無い場合（エクスポートボタンが無効化される）
export const Empty: Story = {
  args: {
    settings: null,
    activity: {},
    sites: [],
    onRefresh: async () => {},
    onReset: () => {}
  }
};
