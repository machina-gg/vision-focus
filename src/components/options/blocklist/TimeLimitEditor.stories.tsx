import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimeLimitEditor } from './TimeLimitEditor';
import { blockedSite } from '~/test/sites';

const meta = {
  title: 'Options/Blocklist/TimeLimitEditor',
  component: TimeLimitEditor,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TimeLimitEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlwaysBlocked: Story = {
  args: {
    site: blockedSite('twitter.com'),
    onUpdate: () => {}
  }
};

export const WithDailyLimit: Story = {
  args: {
    site: blockedSite('twitter.com', {
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    }),
    onUpdate: () => {},
    remainingSeconds: 1800
  }
};

export const NearLimit: Story = {
  args: {
    site: blockedSite('twitter.com', {
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    }),
    onUpdate: () => {},
    remainingSeconds: 100
  }
};
