import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { GoalDisplay } from './GoalDisplay';

const GoalDisplayWrapper = (args: {
  goalText: string;
  goalSubText?: string;
  canEdit?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(args.goalText);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(args.goalText);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
        padding: '80px 40px',
        borderRadius: '8px'
      }}
    >
      <GoalDisplay
        goalText={args.goalText}
        goalSubText={args.goalSubText || ''}
        textColor="#ffffff"
        fontStyle={{
          fontSize: '48px',
          fontWeight: 700,
          textAlign: 'center'
        }}
        isEditing={isEditing}
        editText={editText}
        canEdit={args.canEdit ?? true}
        onEditTextChange={setEditText}
        onStartEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

const meta = {
  title: 'Newtab/GoalDisplay',
  component: GoalDisplay,
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
  ],
  args: {
    goalText: '',
    goalSubText: '',
    textColor: '#ffffff',
    fontStyle: {},
    isEditing: false,
    editText: '',
    canEdit: true,
    onEditTextChange: () => {},
    onStartEdit: () => {},
    onSave: () => {},
    onCancel: () => {},
    onKeyDown: () => {}
  }
} satisfies Meta<typeof GoalDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <GoalDisplayWrapper goalText="Surpass my rivals and achieve overwhelming results" />
  )
};

export const WithSubText: Story = {
  render: () => (
    <GoalDisplayWrapper
      goalText="Focus on what matters most"
      goalSubText="Build products that customers love"
    />
  )
};

export const LongGoal: Story = {
  render: () => (
    <GoalDisplayWrapper goalText="Complete the product launch by Q2, increase revenue by 50%, and build a team that can scale to 100 users" />
  )
};

export const NotEditable: Story = {
  render: () => (
    <GoalDisplayWrapper goalText="Focus on your goals" canEdit={false} />
  )
};

export const MultilineSubText: Story = {
  render: () => (
    <GoalDisplayWrapper
      goalText="Focus on growth"
      goalSubText="Step 1: Define clear goals\nStep 2: Take consistent action\nStep 3: Measure progress"
    />
  )
};
