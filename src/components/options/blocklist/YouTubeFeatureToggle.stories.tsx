import React from 'react';
import { PlaySquare } from 'lucide-react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { YouTubeFeatureToggle } from './YouTubeFeatureToggle';

const meta = {
  title: 'Options/Blocklist/YouTubeFeatureToggle',
  component: YouTubeFeatureToggle,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  args: {
    icon: <PlaySquare className="w-4 h-4" />,
    title: 'Shorts を非表示にする',
    description: 'ホームと検索から Shorts の棚を隠します',
    onChange: () => {}
  }
} satisfies Meta<typeof YouTubeFeatureToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checked: Story = {
  args: {
    checked: true
  }
};

export const Unchecked: Story = {
  args: {
    checked: false
  }
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true
  }
};
