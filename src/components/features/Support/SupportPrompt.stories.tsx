import type { Meta, StoryObj } from '@storybook/react-vite';

import { SupportPrompt } from './SupportPrompt';

const meta = {
  title: 'Features/SupportPrompt',
  component: SupportPrompt,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof SupportPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismiss: async () => alert('Dismiss')
  }
};
