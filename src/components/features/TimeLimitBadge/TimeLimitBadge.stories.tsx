import type { Meta, StoryObj } from '@storybook/react';

import { TimeLimitBadge } from './TimeLimitBadge';

const meta = {
  title: 'Features/TimeLimitBadge',
  component: TimeLimitBadge,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TimeLimitBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// 残り時間に余裕がある場合
export const Remaining: Story = {
  args: {
    remainingSeconds: 1200,
    limitSeconds: 1800
  }
};

// 残り時間が閾値（20%）を下回り警告表示になる場合
export const Warning: Story = {
  args: {
    remainingSeconds: 240,
    limitSeconds: 1800
  }
};

// 制限時間を使い切った場合
export const Exceeded: Story = {
  args: {
    remainingSeconds: 0,
    limitSeconds: 1800
  }
};

// 省スペース表示（compact）の場合
export const Compact: Story = {
  args: {
    remainingSeconds: 1200,
    limitSeconds: 1800,
    compact: true
  }
};

// 警告表示自体を無効化した場合（showWarning: false）
export const WarningDisabled: Story = {
  args: {
    remainingSeconds: 120,
    limitSeconds: 1800,
    showWarning: false
  }
};
