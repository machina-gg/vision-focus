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

export const Empty: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    presetName: '',
    onPresetNameChange: () => {},
    onCreate: () => {}
  }
};

export const Filled: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    presetName: 'マイプリセット',
    onPresetNameChange: () => {},
    onCreate: () => {}
  }
};

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
