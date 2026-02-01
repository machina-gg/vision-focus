import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../Button';
import { Modal } from './Modal';

const meta = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    children: (
      <div>
        <p className="text-gray-600 mb-4">
          This is a modal dialog. You can put any content here.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Confirm</Button>
        </div>
      </div>
    ),
    onClose: () => {}
  }
};

export const Small: Story = {
  args: {
    isOpen: true,
    title: 'Small Modal',
    size: 'sm',
    children: <p className="text-gray-600">This is a small modal.</p>,
    onClose: () => {}
  }
};

export const Large: Story = {
  args: {
    isOpen: true,
    title: 'Large Modal',
    size: 'lg',
    children: (
      <p className="text-gray-600">
        This is a large modal with more space for content. You can use this for
        forms or complex dialogs.
      </p>
    ),
    onClose: () => {}
  }
};

const InteractiveModalTemplate = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Interactive Modal"
      >
        <p className="text-gray-600 mb-4">
          Click the X button or the backdrop to close this modal.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setIsOpen(false)}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export const Interactive: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    children: 'Interactive modal content'
  },
  render: () => <InteractiveModalTemplate />
};
