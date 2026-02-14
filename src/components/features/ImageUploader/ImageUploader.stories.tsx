import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { ImageUploader } from './ImageUploader';

const ImageUploaderWrapper = (args: {
  initialValue?: string | null;
  maxSizeMB?: number;
  disabled?: boolean;
}) => {
  const [value, setValue] = useState<string | null>(args.initialValue ?? null);

  return (
    <ImageUploader
      value={value}
      onChange={setValue}
      maxSizeMB={args.maxSizeMB}
      disabled={args.disabled}
    />
  );
};

const meta = {
  title: 'Features/ImageUploader',
  component: ImageUploader,
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
    value: null,
    onChange: () => {},
    maxSizeMB: 2,
    disabled: false
  }
} satisfies Meta<typeof ImageUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => <ImageUploaderWrapper />
};

export const WithImage: Story = {
  render: () => (
    <ImageUploaderWrapper initialValue="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='800' height='450' fill='%234f46e5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='white'%3ESample Image%3C/text%3E%3C/svg%3E" />
  )
};

export const Disabled: Story = {
  render: () => <ImageUploaderWrapper disabled />
};

export const DisabledWithImage: Story = {
  render: () => (
    <ImageUploaderWrapper
      initialValue="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='800' height='450' fill='%2310b981'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='white'%3ESample Image%3C/text%3E%3C/svg%3E"
      disabled
    />
  )
};

export const CustomMaxSize: Story = {
  render: () => <ImageUploaderWrapper maxSizeMB={0.5} />
};
