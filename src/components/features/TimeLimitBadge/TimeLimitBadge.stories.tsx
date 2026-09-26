import type { Meta, StoryObj } from '@storybook/react-vite';

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

export const Remaining: Story = {
  args: {
    remainingSeconds: 1200,
    limitSeconds: 1800
  }
};

export const Warning: Story = {
  args: {
    remainingSeconds: 240,
    limitSeconds: 1800
  }
};

export const Exceeded: Story = {
  args: {
    remainingSeconds: 0,
    limitSeconds: 1800
  }
};

export const Compact: Story = {
  args: {
    remainingSeconds: 1200,
    limitSeconds: 1800,
    compact: true
  }
};

export const WarningDisabled: Story = {
  args: {
    remainingSeconds: 120,
    limitSeconds: 1800,
    showWarning: false
  }
};
