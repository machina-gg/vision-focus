import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { BySiteChart } from './BySiteChart';

const meta = {
  title: 'Features/BySiteChart',
  component: BySiteChart,
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
} satisfies Meta<typeof BySiteChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// サイトが複数ある場合
export const WithData: Story = {
  args: {
    data: [
      { domain: 'twitter.com', fullDomain: 'twitter.com', time: 7200 },
      { domain: 'youtube.com', fullDomain: 'youtube.com', time: 5400 },
      { domain: 'reddit.com', fullDomain: 'reddit.com', time: 3600 },
      { domain: 'facebook.com', fullDomain: 'facebook.com', time: 1800 }
    ]
  }
};

// サイトが 1 件だけの場合
export const SingleSite: Story = {
  args: {
    data: [{ domain: 'twitter.com', fullDomain: 'twitter.com', time: 3600 }]
  }
};

// データが無い場合
export const Empty: Story = {
  args: {
    data: []
  }
};
