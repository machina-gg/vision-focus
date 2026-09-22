import type { Meta, StoryObj } from '@storybook/react';

import { HelpFAQ } from './HelpFAQ';

const meta = {
  title: 'Options/HelpFAQ',
  component: HelpFAQ,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof HelpFAQ>;

export default meta;
type Story = StoryObj<typeof meta>;

// props を持たないため、唯一の表示状態
export const Default: Story = {};
