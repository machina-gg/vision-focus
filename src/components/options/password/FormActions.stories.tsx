import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

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

// 送信可能な状態
export const Default: Story = {
  args: {
    onCancel: () => {},
    onSubmit: () => {},
    submitLabel: '設定する',
    submitDisabled: false,
    isProcessing: false
  }
};

// 未入力等で送信できない状態
export const Disabled: Story = {
  args: {
    onCancel: () => {},
    onSubmit: () => {},
    submitLabel: '設定する',
    submitDisabled: true,
    isProcessing: false
  }
};

// 送信処理中の状態
export const Processing: Story = {
  args: {
    onCancel: () => {},
    onSubmit: () => {},
    submitLabel: '設定する',
    submitDisabled: false,
    isProcessing: true
  }
};

// 送信ボタンを危険な操作として表示する状態
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
