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
  // analyticsOptIn 未決定（既定値）のときだけ描画されるモーダルなので、
  // SettingsProvider の初期値（未決定）でそのまま開いた状態になる
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

// analyticsOptIn が未決定のときに自動で開く状態
export const Default: Story = {
  args: {
    onAllow: () => {},
    onDeny: () => {}
  }
};
