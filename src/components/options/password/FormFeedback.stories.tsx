import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

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

// エラーも成功も無い状態（何も表示しない）
export const Empty: Story = {
  args: {
    error: null,
    success: null
  }
};

// エラーメッセージを表示する状態
export const WithError: Story = {
  args: {
    error: 'パスワードが一致しません',
    success: null
  }
};

// 成功メッセージを表示する状態
export const WithSuccess: Story = {
  args: {
    error: null,
    success: 'パスワードを設定しました'
  }
};
