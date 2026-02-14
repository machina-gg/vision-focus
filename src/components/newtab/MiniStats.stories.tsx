import type { Meta, StoryObj } from '@storybook/react';

import { MiniStats } from './MiniStats';

const meta = {
  title: 'Newtab/MiniStats',
  component: MiniStats,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1f2937' },
        { name: 'light', value: '#ffffff' }
      ]
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof MiniStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    blockCount: 12,
    blockingDays: 7,
    isPremium: false
  }
};

export const WithAnalytics: Story = {
  args: {
    blockCount: 24,
    blockingDays: 15,
    isPremium: true,
    onAnalyticsClick: () => alert('Analytics clicked!')
  }
};

export const NoBlocks: Story = {
  args: {
    blockCount: 0,
    blockingDays: 1,
    isPremium: false
  }
};

export const NotInBlocklist: Story = {
  args: {
    blockCount: 5,
    blockingDays: null,
    isPremium: false
  }
};

export const HighNumbers: Story = {
  args: {
    blockCount: 156,
    blockingDays: 365,
    isPremium: true,
    onAnalyticsClick: () => alert('Analytics clicked!')
  }
};
