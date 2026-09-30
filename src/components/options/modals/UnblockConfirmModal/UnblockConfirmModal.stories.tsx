import type { Meta, StoryObj } from '@storybook/react-vite';

import { UnblockConfirmModal } from './UnblockConfirmModal';

const meta = {
  title: 'Options/Modals/UnblockConfirmModal',
  component: UnblockConfirmModal,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof UnblockConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToggleUnblock: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    subject: {
      action: 'toggle',
      domain: 'twitter.com',
      blockStyle: 'フルブロック'
    },
    holdSeconds: 5
  }
};

export const DeleteBlock: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    subject: {
      action: 'delete',
      domain: 'reddit.com',
      blockStyle: 'タイムリミット'
    },
    holdSeconds: 5
  }
};

export const LongHold: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    subject: {
      action: 'toggle',
      domain: 'twitter.com',
      blockStyle: 'フルブロック'
    },
    holdSeconds: 30
  }
};

export const ShortenHold: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    subject: { action: 'shorten-hold', nextHoldSeconds: 5 },
    holdSeconds: 30
  }
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    onConfirm: () => {},
    subject: {
      action: 'toggle',
      domain: 'twitter.com',
      blockStyle: 'フルブロック'
    },
    holdSeconds: 5
  }
};
