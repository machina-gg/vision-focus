import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Header } from './Header'

const meta = {
  title: 'Features/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    showSettings: true,
    onSettingsClick: () => alert('Settings clicked!'),
  },
}

export const WithoutSettings: Story = {
  args: {
    showSettings: false,
  },
}
