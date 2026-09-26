import type { Meta, StoryObj } from '@storybook/react-vite';

import { HelpGettingStarted } from './HelpGettingStarted';

const meta = {
  title: 'Options/HelpGettingStarted',
  component: HelpGettingStarted,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof HelpGettingStarted>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
