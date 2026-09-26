import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsSummary } from './AnalyticsSummary';
import { daysAgoKey, mockActivity } from '~/stories/mockActivity';
import { selectTrackedSiteRows } from '~/lib/siteSelectors';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';

/** 今日から days 日前の時刻（ブロック開始日は今日基準の相対で作る） */
const isoDaysAgo = (days: number): string =>
  new Date(`${daysAgoKey(days)}T12:00:00`).toISOString();

// twitter.com はブロック中、facebook.com / reddit.com はブロックリストから外して追跡だけが続く
const mixedRows = selectTrackedSiteRows(
  sitesOf(
    blockedSite('twitter.com', { addedAt: isoDaysAgo(3) }),
    trackedSite('facebook.com'),
    trackedSite('reddit.com')
  )
);

// 解除日と解除後の時間は activity から出る
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

// ブロック中・解除済みが混在し、合計浪費時間も表示される場合
export const WithTrackedSites: Story = {
  args: {
    activity: mixedActivity,
    sites: ['twitter.com', 'facebook.com', 'reddit.com'],
    trackedSiteRows: mixedRows,
    onReblock: () => {},
    onStopTracking: () => {}
  }
};

// 追跡サイトが無い場合（空状態）
export const NoTrackedSites: Story = {
  args: {
    activity: {},
    sites: [],
    trackedSiteRows: [],
    onReblock: () => {},
    onStopTracking: () => {}
  }
};
