import type { Meta, StoryObj } from '@storybook/react-vite';

import { YouTubeSection } from './YouTubeSection';
import type { YouTubeSettings } from '~/types/storage';

const baseYouTube: YouTubeSettings = {
  enabled: false,
  blockAccess: false,
  hideShorts: false,
  hideRecommendations: false,
  hideComments: false,
  hideHomeFeed: false,
  timeLimit: null
};

const meta = {
  title: 'Options/Blocklist/YouTubeSection',
  component: YouTubeSection,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof YouTubeSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// YouTube ブロック機能が無効な場合
export const Disabled: Story = {
  args: {
    youtube: baseYouTube,
    onYouTubeChange: () => {},
    onRequestUnblock: () => {}
  }
};

// 有効だがアクセス自体はブロックしていない場合（個別機能のみオン）
export const EnabledWithFeatures: Story = {
  args: {
    youtube: {
      ...baseYouTube,
      enabled: true,
      hideShorts: true,
      hideRecommendations: true
    },
    onYouTubeChange: () => {},
    onRequestUnblock: () => {}
  }
};

// アクセスをブロックし、1 日の時間制限も設定している場合
export const EnabledWithBlockAccess: Story = {
  args: {
    youtube: {
      ...baseYouTube,
      enabled: true,
      blockAccess: true,
      hideShorts: true,
      hideComments: true,
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    },
    onYouTubeChange: () => {},
    onRequestUnblock: () => {}
  }
};
