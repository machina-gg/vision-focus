import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { UpgradePrompt } from './UpgradePrompt';

const meta = {
  title: 'Features/UpgradePrompt',
  component: UpgradePrompt,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof UpgradePrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardVariant: Story = {
  args: {
    limitType: 'blocklist',
    variant: 'card',
    showFeatures: true,
    onUpgradeClick: () => alert('Upgrade clicked!')
  }
};

export const InlineVariant: Story = {
  args: {
    limitType: 'blocklist',
    variant: 'inline',
    onUpgradeClick: () => alert('Upgrade clicked!')
  }
};

export const BannerVariant: Story = {
  args: {
    limitType: 'history',
    variant: 'banner',
    onUpgradeClick: () => alert('Upgrade clicked!')
  }
};

export const CustomBackgroundLimit: Story = {
  args: {
    limitType: 'customBackground',
    variant: 'card',
    showFeatures: true,
    onUpgradeClick: () => alert('Upgrade clicked!')
  }
};

export const WithoutFeatures: Story = {
  args: {
    limitType: 'blocklist',
    variant: 'card',
    showFeatures: false,
    onUpgradeClick: () => alert('Upgrade clicked!')
  }
};

export const CustomMessage: Story = {
  args: {
    limitType: 'blocklist',
    variant: 'card',
    message: 'Upgrade to unlock unlimited power!',
    showFeatures: true,
    onUpgradeClick: () => alert('Upgrade clicked!')
  }
};

export const CustomFeatures: Story = {
  args: {
    limitType: 'blocklist',
    variant: 'card',
    showFeatures: true,
    features: [
      'Unlimited analytics history',
      'Custom backgrounds',
      'Priority support',
      'Advanced reporting'
    ],
    onUpgradeClick: () => alert('Upgrade clicked!')
  }
};
