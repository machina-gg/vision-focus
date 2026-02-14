import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { Ban, Calendar, Crown, HelpCircle } from 'lucide-react';

import { Tabs } from '~/components/ui';
import {
  BlocklistTab,
  SchedulesTab,
  PremiumTab,
  HelpTab
} from '~/components/options';
import type { AppSettings } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';

import './styles/globals.css';

const tabs = [
  { id: 'blocklist', label: 'Blocklist', icon: Ban },
  { id: 'schedules', label: 'Schedules', icon: Calendar },
  { id: 'premium', label: 'Premium', icon: Crown },
  { id: 'help', label: 'Help', icon: HelpCircle }
] as const;

type TabId = (typeof tabs)[number]['id'];

function OptionsDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('blocklist');
  const [settings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'blocklist':
        return (
          <BlocklistTab
            settings={settings}
            newDomain=""
            setNewDomain={() => {}}
            blockError=""
            onAddDomain={() => {}}
            onRemoveDomain={() => {}}
            onToggleDomain={() => {}}
            onUpdateTimeLimit={() => {}}
            onUpdateNotifications={() => {}}
            youtube={settings.youtube}
            onYouTubeChange={() => {}}
          />
        );
      case 'schedules':
        return (
          <SchedulesTab
            settings={settings}
            vision={undefined}
            onAddSchedule={() => alert('Add schedule')}
            onEditSchedule={() => {}}
            onDeleteSchedule={() => {}}
            onToggleSchedule={() => {}}
          />
        );
      case 'premium':
        return (
          <PremiumTab
            isPremium={false}
            onUpgrade={() => alert('Upgrade clicked')}
            onManageSubscription={() => alert('Manage subscription')}
          />
        );
      case 'help':
        return (
          <HelpTab
            settings={settings}
            onSettingsChange={() => {}}
            onPasswordUpdate={async () => {}}
            onAnalyticsOptInChange={async () => {}}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              VisionFocus Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure your blocking and display preferences
            </p>
          </div>

          <Tabs
            tabs={tabs.map((tab) => ({
              id: tab.id,
              label: tab.label,
              icon: <tab.icon className="w-4 h-4" />
            }))}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
          />

          <div className="p-6">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Pages/Options',
  component: OptionsDemo,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof OptionsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const SchedulesViewWrapper = () => {
  const [activeTab, setActiveTab] = useState<TabId>('schedules');
  const [settings] = useState<AppSettings>(DEFAULT_SETTINGS);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              VisionFocus Settings
            </h1>
          </div>
          <Tabs
            tabs={tabs.map((tab) => ({
              id: tab.id,
              label: tab.label,
              icon: <tab.icon className="w-4 h-4" />
            }))}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
          />
          <div className="p-6">
            <SchedulesTab
              settings={settings}
              vision={undefined}
              onAddSchedule={() => alert('Add schedule')}
              onEditSchedule={() => {}}
              onDeleteSchedule={() => {}}
              onToggleSchedule={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SchedulesView: Story = {
  render: () => <SchedulesViewWrapper />
};

const PremiumViewWrapper = () => {
  const [activeTab, setActiveTab] = useState<TabId>('premium');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              VisionFocus Settings
            </h1>
          </div>
          <Tabs
            tabs={tabs.map((tab) => ({
              id: tab.id,
              label: tab.label,
              icon: <tab.icon className="w-4 h-4" />
            }))}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
          />
          <div className="p-6">
            <PremiumTab
              isPremium={false}
              onUpgrade={() => alert('Upgrade clicked')}
              onManageSubscription={() => alert('Manage subscription')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const PremiumView: Story = {
  render: () => <PremiumViewWrapper />
};
