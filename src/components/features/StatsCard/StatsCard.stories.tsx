import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { Ban, Clock, TrendingUp } from 'lucide-react';

import { StatsCard } from './StatsCard';

const meta = {
  title: 'Features/StatsCard',
  component: StatsCard,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['waste', 'invest', 'block', 'neutral']
    }
  }
} satisfies Meta<typeof StatsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WasteTime: Story = {
  args: {
    label: 'Waste Time',
    value: '1h 23m',
    type: 'waste',
    icon: <Clock className="w-4 h-4" />
  }
};

export const InvestTime: Story = {
  args: {
    label: 'Invest Time',
    value: '3h 45m',
    type: 'invest',
    icon: <TrendingUp className="w-4 h-4" />
  }
};

export const BlockCount: Story = {
  args: {
    label: 'Blocked',
    value: '12',
    type: 'block',
    icon: <Ban className="w-4 h-4" />
  }
};

export const Neutral: Story = {
  args: {
    label: 'Total Time',
    value: '5h 08m',
    type: 'neutral'
  }
};

export const AllTypes: Story = {
  args: {
    label: 'Example',
    value: '0'
  },
  render: () => (
    <div className="grid grid-cols-3 gap-3" style={{ width: '320px' }}>
      <StatsCard
        label="Waste"
        value="1h 23m"
        type="waste"
        icon={<Clock className="w-4 h-4" />}
      />
      <StatsCard
        label="Invest"
        value="3h 45m"
        type="invest"
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <StatsCard
        label="Blocked"
        value="12"
        type="block"
        icon={<Ban className="w-4 h-4" />}
      />
    </div>
  )
};
