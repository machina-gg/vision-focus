import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { BlocklistTab } from './BlocklistTab';
import type {
  AppSettings,
  BlockItem,
  NotificationSettings,
  YouTubeSettings
} from '~/types/storage';
import { DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';

const mockBlockList: BlockItem[] = [
  {
    id: '1',
    domain: 'twitter.com',
    isWildcard: false,
    createdAt: '2026-02-01T10:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: '2',
    domain: 'youtube.com',
    isWildcard: false,
    createdAt: '2026-02-02T14:30:00Z',
    enabled: true,
    timeLimit: {
      type: 'daily',
      limitSeconds: 1800
    }
  },
  {
    id: '3',
    domain: 'reddit.com',
    isWildcard: false,
    createdAt: '2026-02-03T09:15:00Z',
    enabled: true,
    timeLimit: null
  }
];

const mockSettings: AppSettings = {
  blockList: mockBlockList,
  schedules: [],
  paused: false,
  language: 'en',
  notifications: {
    timeLimitEnabled: true,
    timeLimitMinutes: 5
  },
  password: {
    enabled: false,
    passwordHash: null
  },
  youtube: {
    enabled: false,
    blockAccess: false,
    hideShorts: false,
    hideRecommendations: false,
    hideComments: false,
    hideSidebar: false,
    hideHomeFeed: false,
    timeLimit: null
  },
  analyticsOptIn: {
    enabled: false,
    decidedAt: '2026-02-01T00:00:00Z'
  }
};

const BlocklistTabWrapper = () => {
  const [settings, setSettings] = useState(mockSettings);
  const [newDomain, setNewDomain] = useState('');
  const [blockError, setBlockError] = useState('');

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      setBlockError('Please enter a domain');
      return;
    }
    const newItem: BlockItem = {
      id: Date.now().toString(),
      domain: newDomain.toLowerCase().trim(),
      isWildcard: newDomain.startsWith('*.'),
      createdAt: new Date().toISOString(),
      enabled: true,
      timeLimit: null
    };
    setSettings({
      ...settings,
      blockList: [...settings.blockList, newItem]
    });
    setNewDomain('');
    setBlockError('');
  };

  const handleRemoveDomain = (id: string) => {
    setSettings({
      ...settings,
      blockList: settings.blockList.filter((item) => item.id !== id)
    });
  };

  const handleToggleDomain = (id: string, enabled: boolean) => {
    setSettings({
      ...settings,
      blockList: settings.blockList.map((item) =>
        item.id === id ? { ...item, enabled } : item
      )
    });
  };

  const handleUpdateNotifications = (notifications: NotificationSettings) => {
    setSettings({ ...settings, notifications });
  };

  const handleYouTubeChange = (youtube: YouTubeSettings) => {
    setSettings({ ...settings, youtube });
  };

  return (
    <BlocklistTab
      settings={settings}
      newDomain={newDomain}
      setNewDomain={setNewDomain}
      blockError={blockError}
      onAddDomain={handleAddDomain}
      onRemoveDomain={handleRemoveDomain}
      onToggleDomain={handleToggleDomain}
      onUpdateTimeLimit={() => {}}
      onUpdateNotifications={handleUpdateNotifications}
      siteBlockCounts={{}}
      timeLimitUsage={{}}
      youtube={settings.youtube}
      onYouTubeChange={handleYouTubeChange}
      unblockHistory={DEFAULT_UNBLOCK_HISTORY}
    />
  );
};

const meta = {
  title: 'Options/BlocklistTab',
  component: BlocklistTab,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Story />
      </div>
    )
  ],
  args: {
    settings: mockSettings,
    newDomain: '',
    setNewDomain: () => {},
    blockError: '',
    onAddDomain: () => {},
    onRemoveDomain: () => {},
    onToggleDomain: () => {},
    onUpdateTimeLimit: () => {},
    onUpdateNotifications: () => {},
    siteBlockCounts: {},
    timeLimitUsage: {},
    youtube: mockSettings.youtube,
    onYouTubeChange: () => {},
    unblockHistory: DEFAULT_UNBLOCK_HISTORY
  }
} satisfies Meta<typeof BlocklistTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <BlocklistTabWrapper />
};

// ストーリー: 追跡サイトがある場合
export const WithTrackedSites: Story = {
  args: {
    unblockHistory: {
      sites: {
        'twitter.com': {
          domain: 'twitter.com',
          status: 'blocked',
          blockedAt: '2026-02-10T10:00:00Z',
          unblockedAt: null,
          timeAfterUnblock: 0,
          lastActivity: null
        },
        'facebook.com': {
          domain: 'facebook.com',
          status: 'unblocked',
          blockedAt: '2026-02-05T08:00:00Z',
          unblockedAt: '2026-02-12T16:30:00Z',
          timeAfterUnblock: 3600,
          lastActivity: '2026-02-14T12:00:00Z'
        },
        'reddit.com': {
          domain: 'reddit.com',
          status: 'blocked',
          blockedAt: '2026-02-08T14:00:00Z',
          unblockedAt: null,
          timeAfterUnblock: 0,
          lastActivity: null
        }
      }
    }
  }
};
