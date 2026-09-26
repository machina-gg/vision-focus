import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { MonthlyTrendChart } from './MonthlyTrendChart';

const meta = {
  title: 'Features/MonthlyTrendChart',
  component: MonthlyTrendChart,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof MonthlyTrendChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
  args: {
    weeklyBreakdown: [
      { weekStart: '2026-01-05', wasteTime: 3600, blockCount: 12 },
      { weekStart: '2026-01-12', wasteTime: 4800, blockCount: 18 },
      { weekStart: '2026-01-19', wasteTime: 2400, blockCount: 9 },
      { weekStart: '2026-01-26', wasteTime: 5400, blockCount: 21 }
    ]
  }
};

export const LargeValues: Story = {
  args: {
    weeklyBreakdown: [
      { weekStart: '2026-01-05', wasteTime: 10800, blockCount: 30 },
      { weekStart: '2026-01-12', wasteTime: 14400, blockCount: 42 },
      { weekStart: '2026-01-19', wasteTime: 9000, blockCount: 25 },
      { weekStart: '2026-01-26', wasteTime: 18000, blockCount: 50 }
    ]
  }
};

export const SingleWeek: Story = {
  args: {
    weeklyBreakdown: [
      { weekStart: '2026-01-05', wasteTime: 1800, blockCount: 5 }
    ]
  }
};
