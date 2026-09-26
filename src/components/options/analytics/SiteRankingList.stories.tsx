import type { Meta, StoryObj } from '@storybook/react-vite';

import { SiteRankingList } from './SiteRankingList';
import { mockActivity, STORY_SITES } from '~/stories/mockActivity';

const meta = {
  title: 'Options/Analytics/SiteRankingList',
  component: SiteRankingList,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof SiteRankingList>;

export default meta;
type Story = StoryObj<typeof meta>;

// ブロック回数の多い順にランキング表示（解除回数バッジ付きのサイトあり）
export const WithRankedSites: Story = {
  args: {
    activity: mockActivity([
      ['twitter.com', { blocks: 30, unblocks: 2 }, 0],
      ['twitter.com', { blocks: 12, unblocks: 1 }, 3],
      ['youtube.com', { blocks: 18 }, 1],
      ['reddit.com', { blocks: 7 }, 5]
    ]),
    sites: STORY_SITES
  }
};

// ランキングが無い場合（コンポーネントは何も描画しない）
export const Empty: Story = {
  args: {
    activity: {},
    sites: STORY_SITES
  }
};
