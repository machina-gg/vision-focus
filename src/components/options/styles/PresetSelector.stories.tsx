import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { PresetSelector } from './PresetSelector';
import type { UsePresetsReturn } from '~/hooks/usePresets';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';
import type { VisionSettings } from '~/types/storage';

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

const presetList = [
  {
    ...DEFAULT_DISPLAY_SETTINGS,
    id: 'preset-1',
    name: '仕事モード',
    createdAt: '2026-02-01T00:00:00Z'
  },
  {
    ...DEFAULT_DISPLAY_SETTINGS,
    id: 'preset-2',
    name: '休憩モード',
    createdAt: '2026-02-05T00:00:00Z'
  }
];

// プリセットが 1 件も無い状態
const emptyPresets: UsePresetsReturn = {
  draftDisplaySettings: DEFAULT_DISPLAY_SETTINGS,
  draftPresets: [],
  selectedPresetId: null,
  editingPresetName: '',
  isDirty: false,
  visionSaved: false,
  showSavePresetModal: false,
  presetName: '',
  deleteTargetPresetId: null,
  deleteTargetScheduleCount: 0,
  ...noopHandlers
};

// プリセットが複数あり、どれも選択していない状態
const withPresetsNoSelection: UsePresetsReturn = {
  ...emptyPresets,
  draftPresets: presetList
};

// プリセットを選択して編集中（未保存の変更あり）の状態
const editingDirty: UsePresetsReturn = {
  ...emptyPresets,
  draftPresets: presetList,
  selectedPresetId: 'preset-1',
  editingPresetName: '仕事モード',
  isDirty: true
};

// 選択中のプリセットが適用済み（アクティブ）の状態
const activePreset: UsePresetsReturn = {
  ...emptyPresets,
  draftPresets: presetList,
  selectedPresetId: 'preset-1',
  editingPresetName: '仕事モード',
  isDirty: false
};

const activeVision: VisionSettings = {
  defaultSettings: DEFAULT_DISPLAY_SETTINGS,
  presets: presetList,
  activePresetId: 'preset-1'
};

const inactiveVision: VisionSettings = {
  defaultSettings: DEFAULT_DISPLAY_SETTINGS,
  presets: presetList,
  activePresetId: null
};

const meta = {
  title: 'Options/Styles/PresetSelector',
  component: PresetSelector,
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
} satisfies Meta<typeof PresetSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// プリセットが 1 件も無い場合
export const Empty: Story = {
  args: {
    presets: emptyPresets,
    vision: inactiveVision
  }
};

// プリセットはあるが、まだ何も選択していない場合
export const NoSelection: Story = {
  args: {
    presets: withPresetsNoSelection,
    vision: inactiveVision
  }
};

// 選択中のプリセットに未保存の変更がある場合
export const EditingDirty: Story = {
  args: {
    presets: editingDirty,
    vision: inactiveVision
  }
};

// 選択中のプリセットが現在アクティブ（適用済み）な場合
export const ActivePreset: Story = {
  args: {
    presets: activePreset,
    vision: activeVision
  }
};
