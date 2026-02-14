import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { HelpTab } from './HelpTab';
import { DEFAULT_SETTINGS } from '~/types/storage';

const meta = {
  title: 'Options/HelpTab',
  component: HelpTab,
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
} satisfies Meta<typeof HelpTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: DEFAULT_SETTINGS,
    onSettingsChange: () => alert('Settings changed'),
    onPasswordUpdate: async () => alert('Password updated'),
    onAnalyticsOptInChange: async () => alert('Analytics opt-in changed')
  }
};

export const WithoutCallbacks: Story = {
  args: {
    settings: DEFAULT_SETTINGS
  }
};
