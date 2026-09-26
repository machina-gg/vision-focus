import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { NewPresetModal } from './NewPresetModal';

const meta = {
  title: 'Options/Modals/NewPresetModal',
  component: NewPresetModal,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof NewPresetModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// 未入力（作成ボタンが無効化されている状態）
export const Empty: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    presetName: '',
    onPresetNameChange: () => {},
    onCreate: () => {}
  }
};

// 名前が入力済み（作成ボタンが押せる状態）
export const Filled: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    presetName: 'マイプリセット',
    onPresetNameChange: () => {},
    onCreate: () => {}
  }
};

// 入力欄への文字入力を実際に反映するインタラクティブな状態
const InteractiveTemplate = () => {
  const [presetName, setPresetName] = useState('');

  return (
    <NewPresetModal
      isOpen
      onClose={() => {}}
      presetName={presetName}
      onPresetNameChange={setPresetName}
      onCreate={() => {}}
    />
  );
};

export const Interactive: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    presetName: '',
    onPresetNameChange: () => {},
    onCreate: () => {}
  },
  render: () => <InteractiveTemplate />
};
