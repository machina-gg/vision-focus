import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScheduleModal } from './ScheduleModal';
import type { ScheduleFormData } from '~/hooks/useSchedules';
import type { VisionSettings } from '~/types/storage';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

const emptyForm: ScheduleFormData = {
  name: '',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3, 4, 5],
  presetId: ''
};

const filledForm: ScheduleFormData = {
  name: '集中タイム',
  startTime: '09:00',
  endTime: '18:00',
  days: [1, 2, 3, 4, 5],
  presetId: 'preset-1'
};

const mockVision: VisionSettings = {
  defaultSettings: DEFAULT_DISPLAY_SETTINGS,
  presets: [
    {
      ...DEFAULT_DISPLAY_SETTINGS,
      id: 'preset-1',
      name: '仕事モード',
      createdAt: '2026-02-01T00:00:00Z'
    }
  ],
  activePresetId: null
};

const meta = {
  title: 'Options/Modals/ScheduleModal',
  component: ScheduleModal,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof ScheduleModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// 新規追加（未入力）の状態
export const AddNew: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    editingSchedule: null,
    scheduleForm: emptyForm,
    onFormChange: () => {},
    onSave: () => {},
    vision: mockVision
  }
};

// 既存スケジュールを編集している状態
export const EditExisting: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    editingSchedule: {
      id: 'schedule-1',
      name: '集中タイム',
      startTime: '09:00',
      endTime: '18:00',
      days: [1, 2, 3, 4, 5],
      enabled: true,
      presetId: 'preset-1'
    },
    scheduleForm: filledForm,
    onFormChange: () => {},
    onSave: () => {},
    vision: mockVision
  }
};

// 重複などで保存できなかった状態（エラー表示あり）
export const WithError: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    editingSchedule: null,
    scheduleForm: filledForm,
    onFormChange: () => {},
    onSave: () => {},
    vision: mockVision,
    error: '既存のスケジュールと重複しています。'
  }
};

// 適用できるプリセットが無い状態
export const NoPresets: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    editingSchedule: null,
    scheduleForm: emptyForm,
    onFormChange: () => {},
    onSave: () => {},
    vision: undefined
  }
};
