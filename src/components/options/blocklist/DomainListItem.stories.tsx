import type { Meta, StoryObj } from '@storybook/react-vite';

import { DomainListItem } from './DomainListItem';
import type { BlockListRow } from '~/lib/siteSelectors';

const baseItem: BlockListRow = {
  id: '1',
  domain: 'twitter.com',
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
    usedSeconds: 0,
    onToggle: () => {},
    onRemove: () => {},
    onUpdateTimeLimit: () => {}
  }
};

export const WithTimeLimit: Story = {
  args: {
    item: {
      ...baseItem,
      id: '3',
      domain: 'youtube.com',
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    },
    blockCount: 5,
    usedSeconds: 900,
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
    usedSeconds: 0,
    onToggle: () => {},
    onRemove: () => {},
    onUpdateTimeLimit: () => {}
  }
};
