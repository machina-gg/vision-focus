import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { AnalyticsDateFilter } from './AnalyticsDateFilter';
import { STORY_SITES, storyActivity } from '~/stories/mockActivity';

const meta = {
  title: 'Options/Analytics/AnalyticsDateFilter',
  component: AnalyticsDateFilter,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  // 設定画面の本文と同じ幅（max-w-6xl）で、全幅表示のレポートを確かめる
  decorators: [
    (Story) => (
      <div className="max-w-6xl mx-auto">
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof AnalyticsDateFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

// 週次・月次データがある場合
export const WithData: Story = {
  args: {
    activity: storyActivity(),
    sites: STORY_SITES,
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};

// 月次のタブを選んだ場合
export const MonthlyTab: Story = {
  args: {
    activity: storyActivity(),
    sites: STORY_SITES,
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('tab-report-monthly'));
  }
};

// データが無い場合
export const Empty: Story = {
  args: {
    activity: {},
    sites: STORY_SITES,
    isSupportPromptVisible: true,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};

// 支援の案内を出さない場合
export const WithoutSupportPrompt: Story = {
  args: {
    activity: storyActivity(),
    sites: STORY_SITES,
    isSupportPromptVisible: false,
    onSupport: async () => alert('Open Buy Me a Coffee'),
    onDismissSupport: async () => alert('Dismiss')
  }
};
