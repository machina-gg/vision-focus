import type { Meta, StoryObj } from '@storybook/react-vite';

import { MiniStats } from './MiniStats';

const meta = {
  title: 'Newtab/MiniStats',
  component: MiniStats,
  parameters: {
    layout: 'centered'
  },
  globals: {
    backgrounds: { value: 'dark' }
  },
  tags: ['autodocs']
} satisfies Meta<typeof MiniStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    blockCount: 12,
    blockingDays: 7
  }
};

export const WithAnalytics: Story = {
  args: {
    blockCount: 24,
    blockingDays: 15,
    onAnalyticsClick: () => alert('Analytics clicked!')
  }
};

export const NoBlocks: Story = {
  args: {
    blockCount: 0,
    blockingDays: 1
  }
};

export const NotInBlocklist: Story = {
  args: {
    blockCount: 5,
    blockingDays: null
  }
};

export const HighNumbers: Story = {
  args: {
    blockCount: 156,
    blockingDays: 365,
    onAnalyticsClick: () => alert('Analytics clicked!')
  }
};
