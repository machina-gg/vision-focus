import type { Meta, StoryObj } from '@storybook/react';

import { DomainListItem } from './DomainListItem';
import type { BlockItem, TimeLimitUsage } from '~/types/storage';

const baseItem: BlockItem = {
  id: '1',
  domain: 'twitter.com',
  isWildcard: false,
  createdAt: '2026-02-01T10:00:00Z',
  enabled: true,
  timeLimit: null
};

const meta = {
  title: 'Options/Blocklist/DomainListItem',
  component: DomainListItem,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof DomainListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// 常時ブロック・ブロック回数の記録がある場合
export const Basic: Story = {
  args: {
    item: baseItem,
    blockCount: 12,
    usage: undefined,
    onToggle: () => {},
    onRemove: () => {},
    onUpdateTimeLimit: () => {}
  }
};

// ワイルドカードドメインの場合
export const WithWildcard: Story = {
  args: {
    item: { ...baseItem, id: '2', domain: 'example.com', isWildcard: true },
    blockCount: 0,
    usage: undefined,
    onToggle: () => {},
    onRemove: () => {},
    onUpdateTimeLimit: () => {}
  }
};

// 時間制限が設定され、利用状況の記録がある場合
export const WithTimeLimit: Story = {
  args: {
    item: {
      ...baseItem,
      id: '3',
      domain: 'youtube.com',
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    },
    blockCount: 5,
    usage: {
      domain: 'youtube.com',
      dailyUsedSeconds: 900,
      lastDailyReset: '2026-02-15'
    } satisfies TimeLimitUsage,
    onToggle: () => {},
    onRemove: () => {},
    onUpdateTimeLimit: () => {}
  }
};

// トグルで無効化されている場合
export const Disabled: Story = {
  args: {
    item: { ...baseItem, id: '4', domain: 'reddit.com', enabled: false },
    blockCount: 0,
    usage: undefined,
    onToggle: () => {},
    onRemove: () => {},
    onUpdateTimeLimit: () => {}
  }
};
