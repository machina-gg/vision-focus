import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { SettingsTab } from './SettingsTab';
import { SettingsProvider } from '~/contexts/SettingsContext';

const meta = {
  title: 'Options/SettingsTab',
  component: SettingsTab,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    // SettingsTab は設定値を useSettings() から読むため Provider が要る
    (Story) => (
      <SettingsProvider>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Story />
        </div>
      </SettingsProvider>
    )
  ]
} satisfies Meta<typeof SettingsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onPasswordUpdate: async () => alert('Password updated'),
    onUnblockConfirmUpdate: async () => alert('Hold duration updated'),
    onUpdateNotifications: () => alert('Notifications updated'),
    onAnalyticsOptInChange: async () => alert('Analytics opt-in changed'),
    onSettingsChange: () => alert('Settings changed')
  }
};
