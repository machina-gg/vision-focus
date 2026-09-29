import type { Meta, StoryObj } from '@storybook/react-vite';

import { AllowedSiteItem } from './AllowedSiteItem';

const meta = {
  title: 'Options/Blocklist/AllowedSiteItem',
  component: AllowedSiteItem,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  args: {
    onRemove: () => {},
    onSetRecording: () => {}
  }
} satisfies Meta<typeof AllowedSiteItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExceptionOfBlock: Story = {
  args: {
    site: {
      domain: 'music.youtube.com',
      recordTime: false,
      exceptionOf: 'youtube.com'
    }
  }
};

export const Recording: Story = {
  args: {
    site: {
      domain: 'music.youtube.com',
      recordTime: true,
      exceptionOf: 'youtube.com'
    }
  }
};

export const NoBlock: Story = {
  args: {
    site: { domain: 'docs.example.com', recordTime: false, exceptionOf: null }
  }
};
