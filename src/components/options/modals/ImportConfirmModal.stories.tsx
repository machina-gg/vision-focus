import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImportConfirmModal } from './ImportConfirmModal';

const meta = {
  title: 'Options/Modals/ImportConfirmModal',
  component: ImportConfirmModal,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof ImportConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    requiresPassword: false,
    onConfirm: async () => null
  }
};

export const PasswordProtected: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    requiresPassword: true,
    onConfirm: async () => null
  }
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    requiresPassword: false,
    onConfirm: async () => null
  }
};
