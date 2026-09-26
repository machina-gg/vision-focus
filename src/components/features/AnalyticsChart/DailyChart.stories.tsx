import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { DailyChart } from './DailyChart';

const meta = {
  title: 'Features/DailyChart',
  component: DailyChart,
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
} satisfies Meta<typeof DailyChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
  args: {
    data: [
      { date: '2026-02-02', time: 1800 },
      { date: '2026-02-03', time: 2400 },
      { date: '2026-02-04', time: 900 },
      { date: '2026-02-05', time: 3000 },
      { date: '2026-02-06', time: 1500 },
      { date: '2026-02-07', time: 600 },
      { date: '2026-02-08', time: 4200 },
      { date: '2026-02-09', time: 3300 },
      { date: '2026-02-10', time: 1200 },
      { date: '2026-02-11', time: 2700 },
      { date: '2026-02-12', time: 3900 },
      { date: '2026-02-13', time: 1000 },
      { date: '2026-02-14', time: 2100 },
      { date: '2026-02-15', time: 3600 }
    ]
  }
};

export const LargeValues: Story = {
  args: {
    data: [
      { date: '2026-02-13', time: 10800 },
      { date: '2026-02-14', time: 14400 },
      { date: '2026-02-15', time: 9000 }
    ]
  }
};

export const Empty: Story = {
  args: {
    data: []
  }
};
