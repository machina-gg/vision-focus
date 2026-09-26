import type { Meta, StoryObj } from '@storybook/react-vite';

import { StatsGrid } from './StatsGrid';

const meta = {
  title: 'Features/StatsGrid',
  component: StatsGrid,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof StatsGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// 無駄時間が前期間より減った（改善）場合
export const Improved: Story = {
  args: {
    wasteTime: 3600,
    blockCount: 12,
    unblockCount: 2,
    wasteTimeChangePercent: -15.5
  }
};

// 無駄時間が前期間より増えた（悪化）場合
export const Worsened: Story = {
  args: {
    wasteTime: 7200,
    blockCount: 20,
    unblockCount: 5,
    wasteTimeChangePercent: 22.3
  }
};

// 前期間と変化が無い場合
export const Unchanged: Story = {
  args: {
    wasteTime: 5400,
    blockCount: 15,
    unblockCount: 3,
    wasteTimeChangePercent: 0
  }
};

// 比較できる前期間データが無い場合
export const NoComparisonData: Story = {
  args: {
    wasteTime: 3600,
    blockCount: 10,
    unblockCount: 1,
    wasteTimeChangePercent: null
  }
};
