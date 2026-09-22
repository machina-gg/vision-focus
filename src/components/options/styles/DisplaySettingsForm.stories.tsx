import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { DisplaySettingsForm } from './DisplaySettingsForm';
import type { UsePresetsReturn } from '~/hooks/usePresets';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

// フォームの入力欄を触るためのハンドラは空実装で十分（Storybook では
// 実際の保存は行わない）
const noopHandlers: Pick<
  UsePresetsReturn,
  | 'setShowSavePresetModal'
  | 'setPresetName'
  | 'handleSelectPreset'
  | 'handlePresetNameChange'
  | 'handleRequestDeletePreset'
  | 'handleConfirmDeletePreset'
  | 'handleCancelDeletePreset'
  | 'handleSaveSelectedPreset'
  | 'handleApplyPreset'
  | 'handleCreatePreset'
  | 'handleGoalTextChange'
  | 'handleGoalSubTextChange'
  | 'handleTextColorChange'
  | 'handleBackgroundTypeChange'
  | 'handleBackgroundChange'
  | 'handleBackgroundColorChange'
  | 'handleCustomBackgroundChange'
  | 'handleFontSettingsChange'
> = {
  setShowSavePresetModal: () => {},
  setPresetName: () => {},
  handleSelectPreset: () => {},
  handlePresetNameChange: () => {},
  handleRequestDeletePreset: async () => {},
  handleConfirmDeletePreset: async () => {},
  handleCancelDeletePreset: () => {},
  handleSaveSelectedPreset: async () => {},
  handleApplyPreset: async () => {},
  handleCreatePreset: async () => {},
  handleGoalTextChange: () => {},
  handleGoalSubTextChange: () => {},
  handleTextColorChange: () => {},
  handleBackgroundTypeChange: () => {},
  handleBackgroundChange: () => {},
  handleBackgroundColorChange: () => {},
  handleCustomBackgroundChange: () => {},
  handleFontSettingsChange: () => {}
};

// プリセットを選択して編集している状態
const editingPresets: UsePresetsReturn = {
  draftDisplaySettings: {
    ...DEFAULT_DISPLAY_SETTINGS,
    goalText: '1日1時間だけ SNS を見る',
    goalSubText: '達成したら自分にご褒美をあげよう'
  },
  draftPresets: [
    {
      ...DEFAULT_DISPLAY_SETTINGS,
      id: 'preset-1',
      name: '仕事モード',
      createdAt: '2026-02-01T00:00:00Z'
    }
  ],
  selectedPresetId: 'preset-1',
  editingPresetName: '仕事モード',
  isDirty: false,
  visionSaved: false,
  showSavePresetModal: false,
  presetName: '',
  deleteTargetPresetId: null,
  deleteTargetScheduleCount: 0,
  ...noopHandlers
};

// どのプリセットも選択していない状態（何も描画しない）
const noSelection: UsePresetsReturn = {
  ...editingPresets,
  selectedPresetId: null
};

const meta = {
  title: 'Options/Styles/DisplaySettingsForm',
  component: DisplaySettingsForm,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof DisplaySettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// プリセットを選択して編集している状態
export const Editing: Story = {
  args: {
    presets: editingPresets
  }
};

// 選択中のプリセットが無い状態（フォームを描画しない）
export const NoSelection: Story = {
  args: {
    presets: noSelection
  }
};
