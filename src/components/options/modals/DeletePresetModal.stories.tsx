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

// 参照しているスケジュールが 1 件だけの場合
export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    scheduleCount: 1
  }
};

// 参照しているスケジュールが複数ある場合
export const MultipleSchedules: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    scheduleCount: 3
  }
};

// 閉じている状態
export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    onConfirm: () => {},
    scheduleCount: 1
  }
};
