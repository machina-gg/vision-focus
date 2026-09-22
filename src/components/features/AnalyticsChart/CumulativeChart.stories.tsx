import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { CumulativeChart } from './CumulativeChart';

const meta = {
  title: 'Features/CumulativeChart',
  component: CumulativeChart,
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
} satisfies Meta<typeof CumulativeChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// 分単位で収まる場合
export const WithData: Story = {
  args: {
    data: [
      { date: '2026-02-10', cumulative: 600 },
      { date: '2026-02-11', cumulative: 1500 },
      { date: '2026-02-12', cumulative: 2400 },
      { date: '2026-02-13', cumulative: 3000 },
      { date: '2026-02-14', cumulative: 4200 }
    ]
  }
};

// 値が大きく、時間単位の目盛りに切り替わる場合
export const LargeValues: Story = {
  args: {
    data: [
      { date: '2026-02-10', cumulative: 10800 },
      { date: '2026-02-11', cumulative: 25200 },
      { date: '2026-02-12', cumulative: 43200 },
      { date: '2026-02-13', cumulative: 61200 }
    ]
  }
};

// データが無い場合
export const Empty: Story = {
  args: {
    data: []
  }
};
