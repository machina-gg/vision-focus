import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ban, Shield, Timer, Unlock } from 'lucide-react';

import { GoalCard, Header, QuickBlockButton } from '~/components/features';

import '~/styles/globals.css';

function PopupDemo() {
  const goalText = 'Surpass my rivals and achieve overwhelming results';
  const currentDomain = 'twitter.com';
  const stats = {
    blocks: '12',
    topBlockedSite: 'twitter.com',
    wastedTime: '1h 23m',
    unblocks: '2'
  };

  return (
    <div className="w-[360px] min-h-[400px] max-h-[480px] bg-white">
      <Header onSettingsClick={() => alert('Settings clicked')} />

      <div className="p-4 space-y-4">
        <GoalCard goalText={goalText} onClick={() => alert('Goal clicked')} />

        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Today's Summary
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-block-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="w-4 h-4 text-block-500" />
                <span className="text-xs font-medium text-gray-500">
                  Blocked
                </span>
              </div>
              <p className="text-2xl font-bold text-block-600">
                {stats.blocks}
              </p>
            </div>
            <div className="bg-info-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-info-500" />
                <span className="text-xs font-medium text-gray-500">
                  Top blocked
                </span>
              </div>
              <p className="text-sm font-bold text-info-600 truncate">
                {stats.topBlockedSite}
              </p>
            </div>
            <div className="bg-warning-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-warning-500" />
                <span className="text-xs font-medium text-gray-500">
                  Wasted
                </span>
              </div>
              <p className="text-2xl font-bold text-warning-600">
                {stats.wastedTime}
              </p>
            </div>
            <div className="bg-success-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Unlock className="w-4 h-4 text-success-500" />
                <span className="text-xs font-medium text-gray-500">
                  Unblocked
                </span>
              </div>
              <p className="text-2xl font-bold text-success-600">
                {stats.unblocks}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <QuickBlockButton
            currentDomain={currentDomain}
            onBlock={(domain) => alert(`Blocking: ${domain}`)}
          />
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Pages/Popup',
  component: PopupDemo,
  parameters: {
    layout: 'centered'
  },
  globals: {
    backgrounds: { value: 'gray' }
  },
  tags: ['autodocs']
} satisfies Meta<typeof PopupDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
