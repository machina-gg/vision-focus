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

export const Empty: Story = {
  args: {
    items: [],
    valueType: 'time',
    bgColor: 'bg-danger-50',
    textColor: 'text-danger-600'
  }
};
