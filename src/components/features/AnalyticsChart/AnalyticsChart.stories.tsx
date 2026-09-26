import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsChart } from './AnalyticsChart';
import {
  mockActivity,
  STORY_SITES,
  storyActivity
} from '~/stories/mockActivity';

const meta = {
  title: 'Features/AnalyticsChart',
  component: AnalyticsChart,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof AnalyticsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DailyView: Story = {
  args: {
    activity: storyActivity(),
    sites: STORY_SITES,
    disabled: false
  }
};

export const Empty: Story = {
  args: {
    activity: {},
    sites: [],
    disabled: false
  }
};

export const Disabled: Story = {
  args: {
    activity: storyActivity(),
    sites: STORY_SITES,
    disabled: true
  }
};

export const SingleSite: Story = {
  args: {
    activity: mockActivity([['twitter.com', { seconds: 7200, blocks: 15 }, 0]]),
    sites: ['twitter.com'],
    disabled: false
  }
};
