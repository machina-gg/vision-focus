import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimeLimitEditor } from './TimeLimitEditor';
import type { BlockItem } from '~/types/storage';

const baseItem: BlockItem = {
  id: '1',
  domain: 'twitter.com',
  isWildcard: false,
  createdAt: '2026-02-01T10:00:00Z',
  enabled: true,
  timeLimit: null
};

const meta = {
  title: 'Options/Blocklist/TimeLimitEditor',
  component: TimeLimitEditor,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TimeLimitEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// 常時ブロック（時間制限なし）の場合
export const AlwaysBlocked: Story = {
  args: {
    item: baseItem,
    onUpdate: () => {},
    usedSeconds: 0
  }
};

// 1 日の制限時間が設定されている場合
export const WithDailyLimit: Story = {
  args: {
    item: { ...baseItem, timeLimit: { type: 'daily', limitSeconds: 1800 } },
    onUpdate: () => {},
    usedSeconds: 0
  }
};

// 制限に近づいている場合（残り時間バッジが警告色になる）
export const NearLimit: Story = {
  args: {
    item: { ...baseItem, timeLimit: { type: 'daily', limitSeconds: 1800 } },
    onUpdate: () => {},
    usedSeconds: 1700
  }
};
