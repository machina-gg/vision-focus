import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { WeeklyChart } from './WeeklyChart';

const meta = {
  title: 'Features/WeeklyChart',
  component: WeeklyChart,
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
} satisfies Meta<typeof WeeklyChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// 分単位で収まる週次データ
export const WithData: Story = {
  args: {
    dailyBreakdown: [
      { wasteTime: 1800, blockCount: 3 },
      { wasteTime: 2400, blockCount: 5 },
      { wasteTime: 900, blockCount: 2 },
      { wasteTime: 3000, blockCount: 6 },
      { wasteTime: 1500, blockCount: 4 },
      { wasteTime: 600, blockCount: 1 },
      { wasteTime: 4200, blockCount: 8 }
    ],
    dailyBlockCounts: [3, 5, 2, 6, 4, 1, 8]
  }
};

// 値が大きく、時間単位の目盛りに切り替わる場合
export const LargeValues: Story = {
  args: {
    dailyBreakdown: [
      { wasteTime: 10800, blockCount: 15 },
      { wasteTime: 14400, blockCount: 20 },
      { wasteTime: 9000, blockCount: 12 },
      { wasteTime: 18000, blockCount: 25 },
      { wasteTime: 12600, blockCount: 18 },
      { wasteTime: 7200, blockCount: 10 },
      { wasteTime: 16200, blockCount: 22 }
    ],
    dailyBlockCounts: [15, 20, 12, 25, 18, 10, 22]
  }
};

// 1 週間ともにデータが無い場合
export const Empty: Story = {
  args: {
    dailyBreakdown: [
      { wasteTime: 0, blockCount: 0 },
      { wasteTime: 0, blockCount: 0 },
      { wasteTime: 0, blockCount: 0 },
      { wasteTime: 0, blockCount: 0 },
      { wasteTime: 0, blockCount: 0 },
      { wasteTime: 0, blockCount: 0 },
      { wasteTime: 0, blockCount: 0 }
    ],
    dailyBlockCounts: [0, 0, 0, 0, 0, 0, 0]
  }
};
