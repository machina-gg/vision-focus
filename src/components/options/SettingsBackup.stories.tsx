import type { Meta, StoryObj } from '@storybook/react-vite';

import { SettingsBackup } from './SettingsBackup';

const meta = {
  title: 'Options/SettingsBackup',
  component: SettingsBackup,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof SettingsBackup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSettingsChange: () => {}
  }
};

export const WithoutCallback: Story = {
  args: {}
};
