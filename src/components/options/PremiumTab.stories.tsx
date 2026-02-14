import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { PremiumTab } from './PremiumTab';

const meta = {
  title: 'Options/PremiumTab',
  component: PremiumTab,
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
} satisfies Meta<typeof PremiumTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FreeTier: Story = {
  args: {
    isPremium: false,
    onUpgrade: () => alert('Upgrade clicked!'),
    onManageSubscription: () => alert('Manage subscription')
  }
};

export const PremiumUser: Story = {
  args: {
    isPremium: true,
    onUpgrade: () => alert('Upgrade clicked!'),
    onManageSubscription: () => alert('Manage subscription')
  }
};
