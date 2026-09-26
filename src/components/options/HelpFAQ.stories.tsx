import type { Meta, StoryObj } from '@storybook/react-vite';

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

export const Default: Story = {};
