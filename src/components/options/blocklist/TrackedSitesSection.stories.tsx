import type { Meta, StoryObj } from '@storybook/react-vite';

import { TrackedSitesSection } from './TrackedSitesSection';
import type { TrackedSiteListRow } from '~/lib/siteSelectors';

const blocked = (domain: string, blockedAt: string): TrackedSiteListRow => ({
  domain,
  isBlocked: true,
  blockedAt,
  canReblock: false,
  canStopTracking: false
});

const unblocked = (domain: string): TrackedSiteListRow => ({
  domain,
  isBlocked: false,
  blockedAt: null,
  canReblock: true,
  canStopTracking: true
});

const meta = {
  title: 'Options/Blocklist/TrackedSitesSection',
  component: TrackedSitesSection,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TrackedSitesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// 追跡サイトが複数ある場合
export const WithMultipleSites: Story = {
  args: {
    rows: [
      blocked('twitter.com', '2026-02-10T10:00:00Z'),
      unblocked('facebook.com'),
      blocked('reddit.com', '2026-02-08T09:00:00Z'),
      unblocked('youtube.com')
    ]
  }
};

// すべてブロック中の場合
export const AllBlocked: Story = {
  args: {
    rows: [
      blocked('twitter.com', '2026-02-10T10:00:00Z'),
      blocked('facebook.com', '2026-02-05T08:00:00Z')
    ]
  }
};

// すべて解除済みの場合
export const AllUnblocked: Story = {
  args: {
    rows: [unblocked('twitter.com'), unblocked('facebook.com')]
  }
};

// 追跡サイトがない場合（何も表示されない）
export const NoTrackedSites: Story = {
  args: {
    rows: []
  }
};
