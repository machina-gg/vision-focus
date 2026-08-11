import type { Meta, StoryObj } from '@storybook/react';

import { SupportSection } from './SupportSection';

const meta = {
  title: 'Features/SupportSection',
  component: SupportSection,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof SupportSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
