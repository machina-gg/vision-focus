import type { Meta, StoryObj } from '@storybook/react';

import { HelpDataPrivacy } from './HelpDataPrivacy';
import type { AppSettings } from '~/types/storage';

const baseSettings: AppSettings = {
  blockList: [],
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
  title: 'Options/HelpDataPrivacy',
  component: HelpDataPrivacy,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof HelpDataPrivacy>;

export default meta;
type Story = StoryObj<typeof meta>;

// 分析データの共有に同意済みの場合
export const OptedIn: Story = {
  args: {
    settings: {
      ...baseSettings,
      analyticsOptIn: { enabled: true, decidedAt: '2026-02-10T10:00:00Z' }
    },
    onAnalyticsOptInChange: async () => {}
  }
};

// 分析データの共有を拒否済みの場合
export const OptedOut: Story = {
  args: {
    settings: {
      ...baseSettings,
      analyticsOptIn: { enabled: false, decidedAt: '2026-02-10T10:00:00Z' }
    },
    onAnalyticsOptInChange: async () => {}
  }
};

// まだ未決定・settings が渡されない場合（トグルは未同意扱い）
export const NoSettings: Story = {
  args: {
    settings: undefined,
    onAnalyticsOptInChange: async () => {}
  }
};
