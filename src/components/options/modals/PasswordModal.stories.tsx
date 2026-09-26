import type { Meta, StoryObj } from '@storybook/react-vite';

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

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSuccess: () => {},
    passwordHash: 'dummy-hash'
  }
};

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

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    onSuccess: () => {},
    passwordHash: 'dummy-hash'
  }
};
