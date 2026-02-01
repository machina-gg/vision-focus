import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Card } from './Card';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated']
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg']
    }
  }
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <div>
        <h3 className="font-semibold mb-2">Card Title</h3>
        <p className="text-gray-600">
          This is a default card with some content.
        </p>
      </div>
    )
  }
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <div>
        <h3 className="font-semibold mb-2">Outlined Card</h3>
        <p className="text-gray-600">This card has an outline style.</p>
      </div>
    )
  }
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="font-semibold mb-2">Elevated Card</h3>
        <p className="text-gray-600">This card has a shadow effect.</p>
      </div>
    )
  }
};

export const Clickable: Story = {
  args: {
    variant: 'elevated',
    onClick: () => alert('Card clicked!'),
    children: (
      <div>
        <h3 className="font-semibold mb-2">Clickable Card</h3>
        <p className="text-gray-600">Click me to see an alert.</p>
      </div>
    )
  }
};
