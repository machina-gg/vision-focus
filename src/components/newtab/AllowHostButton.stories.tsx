import type { Meta, StoryObj } from '@storybook/react-vite';

import { AllowHostButton } from './AllowHostButton';

const meta = {
  title: 'Newtab/AllowHostButton',
  component: AllowHostButton,
  parameters: {
    layout: 'centered'
  },
  globals: {
    backgrounds: { value: 'dark' }
  },
  tags: ['autodocs']
} satisfies Meta<typeof AllowHostButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    host: 'music.youtube.com',
    onAllow: async () => null
  }
};

export const Rejected: Story = {
  args: {
    host: 'music.youtube.com',
    onAllow: async () => 'このサイトは許可サイトに登録されています'
  }
};
