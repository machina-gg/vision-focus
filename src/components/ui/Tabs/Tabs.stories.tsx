import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { BarChart3, Clock, Layout, List, Settings } from 'lucide-react';

import { Tabs } from './Tabs';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '500px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const simpleTabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'blocklist', label: 'Block List' },
  { id: 'analytics', label: 'Analytics' }
];

export const Default: Story = {
  args: {
    tabs: simpleTabs,
    activeTab: 'dashboard',
    onChange: () => {}
  }
};

const tabsWithIcons = [
  { id: 'dashboard', label: 'Dashboard', icon: <Layout size={16} /> },
  { id: 'blocklist', label: 'Block List', icon: <List size={16} /> },
  { id: 'schedule', label: 'Schedule', icon: <Clock size={16} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> }
];

export const WithIcons: Story = {
  args: {
    tabs: tabsWithIcons,
    activeTab: 'dashboard',
    onChange: () => {}
  }
};

const InteractiveTabsTemplate = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div>
      <Tabs
        tabs={tabsWithIcons}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      <div className="p-4 mt-4 bg-gray-50 rounded-lg">
        <p className="text-gray-600">
          Active tab: <strong>{activeTab}</strong>
        </p>
      </div>
    </div>
  );
};

export const Interactive: Story = {
  args: {
    tabs: tabsWithIcons,
    activeTab: 'dashboard',
    onChange: () => {}
  },
  render: () => <InteractiveTabsTemplate />
};
