import type { Meta, StoryObj } from '@storybook/react-vite';

import { DomainListItem } from './DomainListItem';
import { blockedSite } from '~/test/sites';

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
    site: blockedSite('twitter.com'),
    blockCount: 12,
    usedSeconds: 0,
    onToggle: () => {},
    onRemove: () => {},
    onUpdateTimeLimit: () => {}
  }
};

export const WithTimeLimit: Story = {
  args: {
    site: blockedSite('reddit.com', {
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    }),
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
    site: blockedSite('facebook.com', { enabled: false }),
    blockCount: 0,
    usedSeconds: 0,
    onToggle: () => {},
    onRemove: () => {},
    onUpdateTimeLimit: () => {}
  }
};
