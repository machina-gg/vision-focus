import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { QuickBlockButton } from './QuickBlockButton';

const meta = {
  title: 'Features/QuickBlockButton',
  component: QuickBlockButton,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof QuickBlockButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDomain: Story = {
  args: {
    currentDomain: 'twitter.com',
    onBlock: (domain) => alert(`Blocking: ${domain}`)
  }
};

export const NoDomain: Story = {
  args: {
    currentDomain: undefined,
    onBlock: () => {}
  }
};

export const LongDomain: Story = {
  args: {
    currentDomain: 'subdomain.example.com',
    onBlock: (domain) => alert(`Blocking: ${domain}`)
  }
};

export const Disabled: Story = {
  args: {
    currentDomain: 'twitter.com',
    onBlock: () => {},
    disabled: true
  }
};
