import type { Meta, StoryObj } from '@storybook/react-vite';

import { HelpTroubleshooting } from './HelpTroubleshooting';

const meta = {
  title: 'Options/HelpTroubleshooting',
  component: HelpTroubleshooting,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof HelpTroubleshooting>;

export default meta;
type Story = StoryObj<typeof meta>;

// props を持たないため、唯一の表示状態
export const Default: Story = {};
