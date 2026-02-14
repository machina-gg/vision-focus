import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { GoalDisplay, MiniStats, BlockedSitesList } from '~/components/newtab';
import { DownloadButton } from '~/components/features';
import type { BlockItem, SiteBlockCount } from '~/types/storage';

import './styles/globals.css';

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
    timeLimit: null
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

const mockBlockCounts: Record<string, SiteBlockCount> = {
  'twitter.com': {
    domain: 'twitter.com',
    count: 15,
    lastBlocked: '2026-02-15T10:00:00Z'
  },
  'youtube.com': {
    domain: 'youtube.com',
    count: 8,
    lastBlocked: '2026-02-15T11:00:00Z'
  },
  'reddit.com': {
    domain: 'reddit.com',
    count: 23,
    lastBlocked: '2026-02-15T12:00:00Z'
  }
};

function NewtabDemo() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex flex-col items-center justify-center p-8"
      style={{
        background: 'linear-gradient(to bottom right, #4f46e5, #7c3aed)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="w-full max-w-4xl mx-auto text-center space-y-8">
        {/* Goal Display */}
        <GoalDisplay
          goalText="Surpass my rivals and achieve overwhelming results"
          goalSubText="Focus on what truly matters"
          textColor="#ffffff"
          fontStyle={{
            fontSize: '48px',
            fontWeight: 700,
            textAlign: 'center'
          }}
          isEditing={false}
          editText=""
          canEdit={true}
          onEditTextChange={() => {}}
          onStartEdit={() => alert('Edit goal')}
          onSave={() => {}}
          onCancel={() => {}}
          onKeyDown={() => {}}
        />

        {/* Mini Stats */}
        <MiniStats blockCount={12} blockingDays={7} isPremium={false} />

        {/* Blocked Sites List */}
        <BlockedSitesList
          blockList={mockBlockList}
          blockCounts={mockBlockCounts}
          maxVisible={5}
        />

        {/* Download Button */}
        <div className="flex justify-center">
          <DownloadButton targetRef={containerRef} />
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Pages/Newtab',
  component: NewtabDemo,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof NewtabDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const LongGoalWrapper = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex flex-col items-center justify-center p-8"
      style={{
        background: 'linear-gradient(to right, #059669, #10b981)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="w-full max-w-4xl mx-auto text-center space-y-8">
        <GoalDisplay
          goalText="Complete the product launch by Q2, increase revenue by 50%, and build a team that can scale to 100 users"
          goalSubText="Break down big goals into actionable steps"
          textColor="#ffffff"
          fontStyle={{
            fontSize: '42px',
            fontWeight: 700,
            textAlign: 'center'
          }}
          isEditing={false}
          editText=""
          canEdit={true}
          onEditTextChange={() => {}}
          onStartEdit={() => alert('Edit goal')}
          onSave={() => {}}
          onCancel={() => {}}
          onKeyDown={() => {}}
        />
        <MiniStats blockCount={0} blockingDays={1} isPremium={false} />
      </div>
    </div>
  );
};

export const LongGoal: Story = {
  render: () => <LongGoalWrapper />
};

const PremiumUserWrapper = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex flex-col items-center justify-center p-8"
      style={{
        background: 'linear-gradient(to bottom, #dc2626, #ea580c)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="w-full max-w-4xl mx-auto text-center space-y-8">
        <GoalDisplay
          goalText="Focus on growth"
          goalSubText=""
          textColor="#ffffff"
          fontStyle={{
            fontSize: '56px',
            fontWeight: 700,
            textAlign: 'center'
          }}
          isEditing={false}
          editText=""
          canEdit={true}
          onEditTextChange={() => {}}
          onStartEdit={() => alert('Edit goal')}
          onSave={() => {}}
          onCancel={() => {}}
          onKeyDown={() => {}}
        />
        <MiniStats
          blockCount={48}
          blockingDays={30}
          isPremium={true}
          onAnalyticsClick={() => alert('Open analytics')}
        />
        <BlockedSitesList
          blockList={mockBlockList}
          blockCounts={mockBlockCounts}
          maxVisible={5}
        />
      </div>
    </div>
  );
};

export const PremiumUser: Story = {
  render: () => <PremiumUserWrapper />
};
