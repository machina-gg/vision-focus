import type { Meta, StoryObj } from '@storybook/react-vite';

import { RankedList } from './RankedList';

const meta = {
  title: 'Features/RankedList',
  component: RankedList,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '320px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof RankedList>;

export default meta;
type Story = StoryObj<typeof meta>;

// 時間表示（無駄時間ランキング相当）
export const TimeValues: Story = {
  args: {
    items: [
      { domain: 'twitter.com', value: 7200 },
      { domain: 'youtube.com', value: 5400 },
      { domain: 'reddit.com', value: 1800 }
    ],
    valueType: 'time',
    bgColor: 'bg-danger-50',
    textColor: 'text-danger-600'
  }
};

// 回数表示（ブロック回数ランキング相当）
export const CountValues: Story = {
  args: {
    items: [
      { domain: 'twitter.com', value: 12 },
      { domain: 'youtube.com', value: 8 },
      { domain: 'reddit.com', value: 3 }
    ],
    valueType: 'count',
    bgColor: 'bg-info-50',
    textColor: 'text-info-600'
  }
};

// 4 件以上あっても上位 3 件だけを表示する境界値
export const MoreThanThree: Story = {
  args: {
    items: [
      { domain: 'twitter.com', value: 12 },
      { domain: 'youtube.com', value: 8 },
      { domain: 'reddit.com', value: 5 },
      { domain: 'facebook.com', value: 3 },
      { domain: 'instagram.com', value: 1 }
    ],
    valueType: 'count',
    bgColor: 'bg-info-50',
    textColor: 'text-info-600'
  }
};

// 長いドメイン名が行の残り幅いっぱいまで表示され、収まらない分だけ省略される
export const LongDomain: Story = {
  args: {
    items: [
      { domain: 'www.extremely-long-subdomain-name.example.com', value: 7200 },
      { domain: 'youtube.com', value: 5400 },
      { domain: 'reddit.com', value: 1800 }
    ],
    valueType: 'time',
    bgColor: 'bg-danger-50',
    textColor: 'text-danger-600'
  }
};

// データが無い場合
export const Empty: Story = {
  args: {
    items: [],
    valueType: 'time',
    bgColor: 'bg-danger-50',
    textColor: 'text-danger-600'
  }
};
