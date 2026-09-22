import type { Meta, StoryObj } from '@storybook/react';

import { PasswordSettingsSection } from './PasswordSettingsSection';

const meta = {
  title: 'Options/PasswordSettingsSection',
  component: PasswordSettingsSection,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof PasswordSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// パスワード保護が無効な場合（初期表示。トグルで設定フォームへ遷移する）
export const Disabled: Story = {
  args: {
    passwordSettings: { enabled: false, passwordHash: null },
    onUpdate: async () => {}
  }
};

// パスワード保護が有効な場合（変更リンクが表示される）
export const Enabled: Story = {
  args: {
    passwordSettings: {
      enabled: true,
      passwordHash:
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d'
    },
    onUpdate: async () => {}
  }
};
