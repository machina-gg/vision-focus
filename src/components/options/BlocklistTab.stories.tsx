import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlocklistTab } from './BlocklistTab';
import { SettingsProvider } from '~/contexts/SettingsContext';
import {
  selectYouTubeSection,
  type BlockListRow,
  type YouTubeSectionValue
} from '~/lib/siteSelectors';

const mockBlockList: BlockListRow[] = [
  {
    id: 'twitter.com',
    domain: 'twitter.com',
    createdAt: '2026-02-01T10:00:00Z',
    enabled: true,
    timeLimit: null
  },
  {
    id: 'instagram.com',
    domain: 'instagram.com',
    createdAt: '2026-02-02T14:30:00Z',
    enabled: true,
    timeLimit: {
      type: 'daily',
      limitSeconds: 1800
    }
  },
  {
    id: 'reddit.com',
    domain: 'reddit.com',
    createdAt: '2026-02-03T09:15:00Z',
    enabled: true,
    timeLimit: null
  }
];

// youtube.com が無いときの節の値（すべて OFF）
const youtubeOff: YouTubeSectionValue = selectYouTubeSection({});

const BlocklistTabWrapper = () => {
  const [blockRows, setBlockList] = useState(mockBlockList);
  const [youtube, setYouTube] = useState(youtubeOff);
  const [newDomain, setNewDomain] = useState('');
  const [blockError, setBlockError] = useState('');

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      setBlockError('Please enter a domain');
      return;
    }
    const domain = newDomain.toLowerCase().trim();
    setBlockList([
      ...blockRows,
      {
        id: domain,
        domain,
        createdAt: new Date().toISOString(),
        enabled: true,
        timeLimit: null
      }
    ]);
    setNewDomain('');
    setBlockError('');
  };

  const handleRemoveDomain = (id: string) => {
    setBlockList(blockRows.filter((item) => item.id !== id));
  };

  const handleToggleDomain = (id: string, enabled: boolean) => {
    setBlockList(
      blockRows.map((item) => (item.id === id ? { ...item, enabled } : item))
    );
  };

  return (
    <SettingsProvider>
      <BlocklistTab
        newDomain={newDomain}
        setNewDomain={setNewDomain}
        blockError={blockError}
        onAddDomain={handleAddDomain}
        onRemoveDomain={handleRemoveDomain}
        onToggleDomain={handleToggleDomain}
        onUpdateTimeLimit={() => {}}
        activity={{}}
        blockRows={blockRows}
        youtube={youtube}
        onYouTubeChange={setYouTube}
      />
    </SettingsProvider>
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
    newDomain: '',
    setNewDomain: () => {},
    blockError: '',
    onAddDomain: () => {},
    onRemoveDomain: () => {},
    onToggleDomain: () => {},
    onUpdateTimeLimit: () => {},
    activity: {},
    blockRows: mockBlockList,
    youtube: youtubeOff,
    onYouTubeChange: () => {}
  }
} satisfies Meta<typeof BlocklistTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <BlocklistTabWrapper />
};

// #370: 長い URL を入力した状態で、入力欄の末尾が確認できること・
// 「追加」ボタンが潰れたり折り返したりしないことを確認するための story
// BlocklistTab は内部で useSettings() を呼ぶため、SettingsProvider で
// ラップしないと Storybook 上でクラッシュする（Default と同じ制約）
export const LongUrlInput: Story = {
  render: () => (
    <SettingsProvider>
      <BlocklistTab
        newDomain="https://example.com/very/long/path/that/keeps/going/on/and/on?query=1234567890&another=abcdefghijklmnopqrstuvwxyz"
        setNewDomain={() => {}}
        blockError=""
        onAddDomain={() => {}}
        onRemoveDomain={() => {}}
        onToggleDomain={() => {}}
        onUpdateTimeLimit={() => {}}
        activity={{}}
        blockRows={mockBlockList}
        youtube={youtubeOff}
        onYouTubeChange={() => {}}
      />
    </SettingsProvider>
  )
};
