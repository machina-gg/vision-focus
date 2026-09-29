import type { Meta, StoryObj } from '@storybook/react-vite';

import { AllowedSitesSection } from './AllowedSitesSection';

const meta = {
  title: 'Options/Blocklist/AllowedSitesSection',
  component: AllowedSitesSection,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  args: {
    error: '',
    onAdd: async (): Promise<string | null> => null,
    onRemove: () => {},
    onSetRecording: () => {}
  }
} satisfies Meta<typeof AllowedSitesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSites: Story = {
  args: {
    sites: [
      { domain: 'docs.example.com', recordTime: false, exceptionOf: null },
      {
        domain: 'music.youtube.com',
        recordTime: true,
        exceptionOf: 'youtube.com'
      }
    ]
  }
};

export const Empty: Story = {
  args: {
    sites: []
  }
};

export const Rejected: Story = {
  args: {
    sites: [],
    error: 'This site is already in your block list',
    onAdd: async () => 'This site is already in your block list'
  }
};
