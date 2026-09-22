import type { Meta, StoryObj } from '@storybook/react';

import { HelpSettingsBackup } from './HelpSettingsBackup';

const meta = {
  title: 'Options/HelpSettingsBackup',
  component: HelpSettingsBackup,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof HelpSettingsBackup>;

export default meta;
type Story = StoryObj<typeof meta>;

// 親から変更通知コールバックを受け取る場合
export const Default: Story = {
  args: {
    onSettingsChange: () => {}
  }
};

// コールバックが渡されない場合（onSettingsChange は任意）
export const WithoutCallback: Story = {
  args: {}
};
