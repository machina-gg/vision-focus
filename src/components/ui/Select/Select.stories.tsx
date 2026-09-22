import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Select } from './Select';

const options = [
  { value: 'sun', label: '日曜日' },
  { value: 'mon', label: '月曜日' },
  { value: 'tue', label: '火曜日' }
];

const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '240px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

// プレースホルダのみ（未選択）の状態
export const Placeholder: Story = {
  args: {
    value: '',
    onChange: () => {},
    options,
    placeholder: '曜日を選択'
  }
};

// 選択済みの状態
export const Selected: Story = {
  args: {
    value: 'mon',
    onChange: () => {},
    options,
    placeholder: '曜日を選択'
  }
};

// 選択肢が無い状態
export const NoOptions: Story = {
  args: {
    value: '',
    onChange: () => {},
    options: [],
    placeholder: '選択肢がありません'
  }
};

// 操作できない（disabled）状態
export const Disabled: Story = {
  args: {
    value: 'mon',
    onChange: () => {},
    options,
    disabled: true
  }
};

// 選択の変更を実際に反映するインタラクティブな状態
const InteractiveTemplate = () => {
  const [value, setValue] = useState('');

  return (
    <Select
      value={value}
      onChange={setValue}
      options={options}
      placeholder="曜日を選択"
    />
  );
};

export const Interactive: Story = {
  args: {
    value: '',
    onChange: () => {},
    options,
    placeholder: '曜日を選択'
  },
  render: () => <InteractiveTemplate />
};
