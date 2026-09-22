import type { Meta, StoryObj } from '@storybook/react';

import { PasswordModal } from './PasswordModal';

const meta = {
  title: 'Options/Modals/PasswordModal',
  component: PasswordModal,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof PasswordModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// 既定のタイトル・説明文で開いた状態
export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSuccess: () => {},
    passwordHash: 'dummy-hash'
  }
};

// 呼び出し側でタイトル・説明文を差し替えた状態
export const CustomTitleAndDescription: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSuccess: () => {},
    passwordHash: 'dummy-hash',
    title: 'ブロックを解除',
    description: 'このサイトのブロックを解除するにはパスワードが必要です。'
  }
};

// 閉じている状態
export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    onSuccess: () => {},
    passwordHash: 'dummy-hash'
  }
};
