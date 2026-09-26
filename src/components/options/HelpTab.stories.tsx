import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { HelpTab } from './HelpTab';

const meta = {
  title: 'Options/HelpTab',
  component: HelpTab,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof HelpTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
