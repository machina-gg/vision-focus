import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { FontPicker } from './FontPicker';
import type { FontSettings } from '~/types/font';

const defaultFontSettings: FontSettings = {
  family: 'system',
  size: 'md',
  weight: 'bold'
};

const FontPickerWrapper = (args: {
  value: FontSettings;
  disabled?: boolean;
  previewText?: string;
}) => {
  const [value, setValue] = useState(args.value);

  return (
    <FontPicker
      value={value}
      onChange={setValue}
      disabled={args.disabled}
      previewText={args.previewText}
    />
  );
};

const meta = {
  title: 'Features/FontPicker',
  component: FontPicker,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ],
  args: {
    value: defaultFontSettings,
    onChange: () => {},
    disabled: false
  }
} satisfies Meta<typeof FontPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <FontPickerWrapper value={defaultFontSettings} />
};

export const CustomPreview: Story = {
  render: () => (
    <FontPickerWrapper
      value={defaultFontSettings}
      previewText="Surpass my rivals and achieve overwhelming results"
    />
  )
};

export const Disabled: Story = {
  render: () => <FontPickerWrapper value={defaultFontSettings} disabled />
};

export const ModernFont: Story = {
  render: () => (
    <FontPickerWrapper
      value={{
        family: 'inter',
        size: 'lg',
        weight: 'semibold'
      }}
    />
  )
};

export const JapaneseFont: Story = {
  render: () => (
    <FontPickerWrapper
      value={{
        family: 'notosansjp',
        size: 'xl',
        weight: 'bold'
      }}
      previewText="目標を達成する"
    />
  )
};
