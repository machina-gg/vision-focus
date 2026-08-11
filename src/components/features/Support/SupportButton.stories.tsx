import type { Meta, StoryObj } from '@storybook/react';

import { SupportButton } from './SupportButton';

const meta = {
  title: 'Features/SupportButton',
  component: SupportButton,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md']
    }
  }
} satisfies Meta<typeof SupportButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClick: () => alert('Open Buy Me a Coffee')
  }
};

export const Small: Story = {
  args: {
    size: 'sm',
    onClick: () => alert('Open Buy Me a Coffee')
  }
};
