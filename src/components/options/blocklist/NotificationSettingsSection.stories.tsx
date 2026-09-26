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
    onUpdate: () => {}
  }
};

// 時間制限通知が無効な場合
export const NotificationDisabled: Story = {
  args: {
    notifications: { timeLimitEnabled: false, timeLimitMinutes: 5 },
    onUpdate: () => {}
  }
};

// 設定が未保存の場合（既定値の有効・5 分前で表示する）
export const NotSaved: Story = {
  args: {
    notifications: undefined,
    onUpdate: () => {}
  }
};
