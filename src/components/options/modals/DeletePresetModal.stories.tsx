import type { Meta, StoryObj } from '@storybook/react-vite';

import { DeletePresetModal } from './DeletePresetModal';

const meta = {
  title: 'Options/Modals/DeletePresetModal',
  component: DeletePresetModal,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof DeletePresetModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    scheduleCount: 1
  }
};

export const MultipleSchedules: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    scheduleCount: 3
  }
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    onConfirm: () => {},
    scheduleCount: 1
  }
};
