import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsOptInModal } from './AnalyticsOptInModal';
import { SettingsProvider } from '~/contexts/SettingsContext';

const meta = {
  title: 'Options/Modals/AnalyticsOptInModal',
  component: AnalyticsOptInModal,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <SettingsProvider>
        <Story />
      </SettingsProvider>
    )
  ]
} satisfies Meta<typeof AnalyticsOptInModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onAllow: () => {},
    onDeny: () => {}
  }
};
