import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyReport } from './EmptyReport';

const meta = {
  title: 'Features/EmptyReport',
  component: EmptyReport,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof EmptyReport>;

export default meta;
type Story = StoryObj<typeof meta>;

// レポートデータが無い場合の既定メッセージ
export const Default: Story = {
  args: {
    message: 'No report data available'
  }
};

// メッセージが長い場合でも折り返して表示されること
export const LongMessage: Story = {
  args: {
    message:
      'まだレポートに表示できるデータがありません。ブロック機能を数日使うと、ここに集計結果が表示されます。'
  }
};
