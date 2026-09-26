import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormFeedback } from './FormFeedback';

const meta = {
  title: 'Options/Password/FormFeedback',
  component: FormFeedback,
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
} satisfies Meta<typeof FormFeedback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    error: null,
    success: null
  }
};

export const WithError: Story = {
  args: {
    error: 'パスワードが一致しません',
    success: null
  }
};

export const WithSuccess: Story = {
  args: {
    error: null,
    success: 'パスワードを設定しました'
  }
};
