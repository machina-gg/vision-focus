import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { PasswordField } from './PasswordField';

const meta = {
  title: 'Options/Password/PasswordField',
  component: PasswordField,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    fieldId: 'password-field-default',
    label: 'パスワード',
    value: '',
    onChange: () => {},
    show: false,
    onToggleShow: () => {},
    placeholder: 'パスワードを入力'
  }
};

export const Shown: Story = {
  args: {
    fieldId: 'password-field-shown',
    label: 'パスワード',
    value: 'my-secret-password',
    onChange: () => {},
    show: true,
    onToggleShow: () => {},
    placeholder: 'パスワードを入力'
  }
};

const InteractiveTemplate = () => {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);

  return (
    <PasswordField
      fieldId="password-field-interactive"
      label="パスワード"
      value={value}
      onChange={setValue}
      show={show}
      onToggleShow={() => setShow((prev) => !prev)}
      placeholder="パスワードを入力"
    />
  );
};

export const Interactive: Story = {
  args: {
    fieldId: 'password-field-interactive',
    label: 'パスワード',
    value: '',
    onChange: () => {},
    show: false,
    onToggleShow: () => {},
    placeholder: 'パスワードを入力'
  },
  render: () => <InteractiveTemplate />
};
