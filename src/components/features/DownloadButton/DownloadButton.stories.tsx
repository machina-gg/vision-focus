import React, { useRef } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { DownloadButton } from './DownloadButton';

const DownloadButtonWrapper = (args: { disabled?: boolean }) => {
  const targetRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div
        ref={targetRef}
        style={{
          width: '800px',
          height: '450px',
          background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '48px',
          fontWeight: 'bold',
          borderRadius: '8px',
          marginBottom: '20px'
        }}
      >
        Sample Wallpaper
      </div>
      <DownloadButton targetRef={targetRef} disabled={args.disabled} />
    </div>
  );
};

const meta = {
  title: 'Features/DownloadButton',
  component: DownloadButton,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof DownloadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DownloadButtonWrapper />
};

export const Disabled: Story = {
  render: () => <DownloadButtonWrapper disabled />
};
