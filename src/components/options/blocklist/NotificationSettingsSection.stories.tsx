import type { Meta, StoryObj } from '@storybook/react';

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

// 時間制限通知が有効な場合（分数選択が表示される）
export const NotificationEnabled: Story = {
  args: {
    notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 },
    onUpdate: () => {},
    hasTimeLimitSites: true
  }
};

// 時間制限通知が無効な場合
export const NotificationDisabled: Story = {
  args: {
    notifications: { timeLimitEnabled: false, timeLimitMinutes: 5 },
    onUpdate: () => {},
    hasTimeLimitSites: true
  }
};

// 時間制限付きサイトが無い場合（コンポーネントは何も描画しない）
export const NoTimeLimitSites: Story = {
  args: {
    notifications: undefined,
    onUpdate: () => {},
    hasTimeLimitSites: false
  }
};
