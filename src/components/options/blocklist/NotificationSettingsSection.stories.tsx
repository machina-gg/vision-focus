import type { Meta, StoryObj } from '@storybook/react-vite';

import { NotificationSettingsSection } from './NotificationSettingsSection';

const meta = {
  title: 'Options/Blocklist/NotificationSettingsSection',
  component: NotificationSettingsSection,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof NotificationSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotificationEnabled: Story = {
  args: {
    notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 },
    onUpdate: () => {}
  }
};

export const NotificationDisabled: Story = {
  args: {
    notifications: { timeLimitEnabled: false, timeLimitMinutes: 5 },
    onUpdate: () => {}
  }
};

export const NotSaved: Story = {
  args: {
    notifications: undefined,
    onUpdate: () => {}
  }
};
