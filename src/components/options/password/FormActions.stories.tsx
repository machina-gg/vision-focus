import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormActions } from './FormActions';

const meta = {
  title: 'Options/Password/FormActions',
  component: FormActions,
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
} satisfies Meta<typeof FormActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: () => {},
    onSubmit: () => {},
    submitLabel: '設定する',
    submitDisabled: false,
    isProcessing: false
  }
};

export const Disabled: Story = {
  args: {
    onCancel: () => {},
    onSubmit: () => {},
    submitLabel: '設定する',
    submitDisabled: true,
    isProcessing: false
  }
};

export const Processing: Story = {
  args: {
    onCancel: () => {},
    onSubmit: () => {},
    submitLabel: '設定する',
    submitDisabled: false,
    isProcessing: true
  }
};

export const DangerVariant: Story = {
  args: {
    onCancel: () => {},
    onSubmit: () => {},
    submitLabel: '削除する',
    submitDisabled: false,
    isProcessing: false,
    submitVariant: 'danger'
  }
};
