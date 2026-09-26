import type { Meta, StoryObj } from '@storybook/react-vite';

import { SettingsDataPrivacy } from './SettingsDataPrivacy';
import type { AppSettings } from '~/types/storage';

const baseSettings: AppSettings = {
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
  unblockConfirm: { holdSeconds: 5 }
};

const meta = {
  title: 'Options/SettingsDataPrivacy',
  component: SettingsDataPrivacy,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof SettingsDataPrivacy>;

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
