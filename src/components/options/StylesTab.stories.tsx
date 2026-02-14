import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { StylesTab } from './StylesTab';
import { FEATURE_LIMITS } from '~/types/premium';

const meta = {
  title: 'Options/StylesTab',
  component: StylesTab,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof StylesTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FreeTier: Story = {
  args: {
    isPremium: false,
    featureLimits: FEATURE_LIMITS.free
  }
};

export const Premium: Story = {
  args: {
    isPremium: true,
    featureLimits: FEATURE_LIMITS.premium
  }
};
