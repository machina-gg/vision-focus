import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { GoalCard } from './GoalCard';

const meta = {
  title: 'Features/GoalCard',
  component: GoalCard,
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
} satisfies Meta<typeof GoalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    goalText: 'Surpass my rivals and achieve overwhelming results'
  }
};

export const LongText: Story = {
  args: {
    goalText:
      'Complete the product launch by Q2, increase revenue by 50%, and build a team that can scale to 100 users'
  }
};

export const Clickable: Story = {
  args: {
    goalText: 'Focus on what matters most',
    onClick: () => alert('Card clicked!')
  }
};

const EditableGoalCardTemplate = () => {
  const [goalText, setGoalText] = useState(
    'Surpass my rivals and achieve overwhelming results'
  );

  return <GoalCard goalText={goalText} editable onEdit={setGoalText} />;
};

export const Editable: Story = {
  args: {
    goalText: 'Editable goal text'
  },
  render: () => <EditableGoalCardTemplate />
};
