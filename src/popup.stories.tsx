import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'
import { Ban, Clock, TrendingUp } from 'lucide-react'

import {
  GoalCard,
  Header,
  QuickBlockButton,
  StatsCard,
} from '~/components/features'

import './styles/globals.css'

function PopupDemo() {
  const goalText = 'Surpass my rivals and achieve overwhelming results'
  const currentDomain = 'twitter.com'
  const stats = {
    wasteTime: '1h 23m',
    investTime: '3h 45m',
    blockCount: '12',
  }

  return (
    <div className="w-[360px] min-h-[400px] max-h-[480px] bg-white">
      <Header onSettingsClick={() => alert('Settings clicked')} />

      <div className="p-4 space-y-4">
        <GoalCard goalText={goalText} onClick={() => alert('Goal clicked')} />

        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Today's Summary
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatsCard
              label="Waste"
              value={stats.wasteTime}
              type="waste"
              icon={<Clock className="w-4 h-4" />}
            />
            <StatsCard
              label="Invest"
              value={stats.investTime}
              type="invest"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatsCard
              label="Blocked"
              value={stats.blockCount}
              type="block"
              icon={<Ban className="w-4 h-4" />}
            />
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
  )
}

const meta = {
  title: 'Pages/Popup',
  component: PopupDemo,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'gray',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PopupDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
