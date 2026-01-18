import React, { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { LockdownButton } from './LockdownButton'

const meta = {
  title: 'Features/LockdownButton',
  component: LockdownButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LockdownButton>

export default meta
type Story = StoryObj<typeof meta>

export const Inactive: Story = {
  args: {
    isActive: false,
    onToggle: () => {},
  },
}

export const Active: Story = {
  args: {
    isActive: true,
    onToggle: () => {},
  },
}

export const Disabled: Story = {
  args: {
    isActive: false,
    onToggle: () => {},
    disabled: true,
  },
}

const InteractiveLockdownTemplate = () => {
  const [isActive, setIsActive] = useState(false)

  return <LockdownButton isActive={isActive} onToggle={setIsActive} />
}

export const Interactive: Story = {
  args: {
    isActive: false,
    onToggle: () => {},
  },
  render: () => <InteractiveLockdownTemplate />,
}
