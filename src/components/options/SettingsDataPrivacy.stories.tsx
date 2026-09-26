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

export const OptedIn: Story = {
  args: {
    settings: {
      ...baseSettings,
      analyticsOptIn: { enabled: true, decidedAt: '2026-02-10T10:00:00Z' }
    },
    onAnalyticsOptInChange: async () => {}
  }
};

export const OptedOut: Story = {
  args: {
    settings: {
      ...baseSettings,
      analyticsOptIn: { enabled: false, decidedAt: '2026-02-10T10:00:00Z' }
    },
    onAnalyticsOptInChange: async () => {}
  }
};

export const NoSettings: Story = {
  args: {
    settings: undefined,
    onAnalyticsOptInChange: async () => {}
  }
};
