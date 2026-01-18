import React, { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Toggle } from './Toggle'

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    checked: false,
    onChange: () => {},
  },
}

export const Checked: Story = {
  args: {
    checked: true,
    onChange: () => {},
  },
}

export const WithLabel: Story = {
  args: {
    checked: false,
    label: 'Enable notifications',
    onChange: () => {},
  },
}

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
    label: 'Disabled toggle',
    onChange: () => {},
  },
}

const InteractiveToggleTemplate = () => {
  const [checked, setChecked] = useState(false)

  return (
    <Toggle
      checked={checked}
      onChange={setChecked}
      label={checked ? 'Enabled' : 'Disabled'}
    />
  )
}

export const Interactive: Story = {
  args: {
    checked: false,
    onChange: () => {},
  },
  render: () => <InteractiveToggleTemplate />,
}
