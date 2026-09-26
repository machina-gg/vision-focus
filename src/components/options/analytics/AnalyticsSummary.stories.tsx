import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsSummary } from './AnalyticsSummary';
import { daysAgoKey, mockActivity } from '~/stories/mockActivity';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';

const isoDaysAgo = (days: number): string =>
  new Date(`${daysAgoKey(days)}T12:00:00`).toISOString();

const mixedSites = sitesOf(
  blockedSite('twitter.com', { addedAt: isoDaysAgo(3) }),
  blockedSite('facebook.com', { addedAt: isoDaysAgo(10), enabled: false }),
  trackedSite('reddit.com')
);

const mixedActivity = mockActivity([
  ['facebook.com', { seconds: 1800, unblocks: 1 }, 3],
  ['facebook.com', { seconds: 1800 }, 0],
  ['reddit.com', { seconds: 3600, unblocks: 1 }, 14],
  ['reddit.com', { seconds: 3600 }, 1]
]);

const meta = {
  title: 'Options/Analytics/AnalyticsSummary',
  component: AnalyticsSummary,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof AnalyticsSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTrackedSites: Story = {
  args: {
    activity: mixedActivity,
    trackedSites: mixedSites,
    onReblock: () => {},
    onStopTracking: () => {}
  }
};

export const NoTrackedSites: Story = {
  args: {
    activity: {},
    trackedSites: {},
    onReblock: () => {},
    onStopTracking: () => {}
  }
};
