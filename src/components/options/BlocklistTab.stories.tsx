import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlocklistTab } from './BlocklistTab';
import { SettingsProvider } from '~/contexts/SettingsContext';
import { blockedSite, sitesOf } from '~/test/sites';
import type { TrackedSites } from '~/types/site';

const mockSites: TrackedSites = sitesOf(
  blockedSite('twitter.com', { addedAt: '2026-02-01T10:00:00Z' }),
  blockedSite('instagram.com', {
    addedAt: '2026-02-02T14:30:00Z',
    timeLimit: { type: 'daily', limitSeconds: 1800 }
  }),
  blockedSite('reddit.com', { addedAt: '2026-02-03T09:15:00Z' })
);

const BlocklistTabWrapper = () => {
  const [trackedSites, setTrackedSites] = useState(mockSites);
  const [newDomain, setNewDomain] = useState('');
  const [blockError, setBlockError] = useState('');

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      setBlockError('Please enter a domain');
      return;
    }
    const domain = newDomain.toLowerCase().trim();
    setTrackedSites({
      ...trackedSites,
      [domain]: blockedSite(domain, { addedAt: new Date().toISOString() })
    });
    setNewDomain('');
    setBlockError('');
  };

  const handleRemoveDomain = (domain: string) => {
    const rest = { ...trackedSites };
    delete rest[domain];
    setTrackedSites(rest);
  };

  const handleToggleDomain = (domain: string, enabled: boolean) => {
    const site = trackedSites[domain];
    if (!site?.block) return;
    setTrackedSites({
      ...trackedSites,
      [domain]: { ...site, block: { ...site.block, enabled } }
    });
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
        trackedSites={trackedSites}
        onYouTubeChange={() => {}}
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
    trackedSites: mockSites,
    onYouTubeChange: () => {}
  }
} satisfies Meta<typeof BlocklistTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <BlocklistTabWrapper />
};

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
        trackedSites={mockSites}
        onYouTubeChange={() => {}}
      />
    </SettingsProvider>
  )
};
