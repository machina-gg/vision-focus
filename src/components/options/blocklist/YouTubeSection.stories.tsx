import type { Meta, StoryObj } from '@storybook/react-vite';

import { YouTubeSection } from './YouTubeSection';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import { blockedSite, trackedSite, youtubeFeatures } from '~/test/sites';

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

export const Disabled: Story = {
  args: {
    site: null,
    allowedCount: 0,
    onYouTubeChange: async () => null,
    onRequestUnblock: () => {}
  }
};

export const EnabledWithFeatures: Story = {
  args: {
    site: trackedSite('youtube.com', {
      youtube: youtubeFeatures({ hideShorts: true, hideRecommendations: true })
    }),
    allowedCount: 0,
    onYouTubeChange: async () => null,
    onRequestUnblock: () => {}
  }
};

export const EnabledWithBlockAccess: Story = {
  args: {
    site: blockedSite(
      'youtube.com',
      { timeLimit: { type: 'daily', limitSeconds: 1800 } },
      { youtube: youtubeFeatures({ hideShorts: true, hideComments: true }) }
    ),
    allowedCount: 0,
    onYouTubeChange: async () => null,
    onRequestUnblock: () => {}
  }
};

export const WithAllowedSites: Story = {
  args: {
    site: blockedSite(YOUTUBE_DOMAIN),
    allowedCount: 1,
    onYouTubeChange: async () => null,
    onRequestUnblock: () => {}
  }
};
