import type { Meta, StoryObj } from '@storybook/react-vite';

import { TrendIcon } from './TrendIcon';

const meta = {
  title: 'Features/TrendIcon',
  component: TrendIcon,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TrendIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

// 改善傾向
export const Improving: Story = {
  args: {
    trend: 'improving'
  }
};

// 悪化傾向
export const Declining: Story = {
  args: {
    trend: 'declining'
  }
};

// 横ばい
export const Stable: Story = {
  args: {
    trend: 'stable'
  }
};
