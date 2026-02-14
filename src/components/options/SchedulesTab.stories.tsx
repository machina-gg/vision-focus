import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { SchedulesTab } from './SchedulesTab';
import type { AppSettings, VisionSettings, Schedule } from '~/types/storage';
import { DEFAULT_SETTINGS, DEFAULT_VISION } from '~/types/storage';

const mockSchedules: Schedule[] = [
  {
    id: '1',
    name: 'Work Hours',
    startTime: '09:00',
    endTime: '17:00',
    days: [1, 2, 3, 4, 5],
    enabled: true
  },
  {
    id: '2',
    name: 'Evening Focus',
    startTime: '19:00',
    endTime: '22:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    enabled: true
  }
];

const SchedulesTabWrapper = () => {
  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
    schedules: mockSchedules
  });
  const [vision] = useState<VisionSettings>(DEFAULT_VISION);

  const handleAddSchedule = () => {
    alert('Add schedule modal would open here');
  };

  const handleEditSchedule = (schedule: Schedule) => {
    alert(`Edit schedule: ${schedule.name}`);
  };

  const handleDeleteSchedule = (id: string) => {
    setSettings({
      ...settings,
      schedules: settings.schedules.filter((s) => s.id !== id)
    });
  };

  const handleToggleSchedule = (id: string, enabled: boolean) => {
    setSettings({
      ...settings,
      schedules: settings.schedules.map((s) =>
        s.id === id ? { ...s, enabled } : s
      )
    });
  };

  return (
    <SchedulesTab
      settings={settings}
      vision={vision}
      onAddSchedule={handleAddSchedule}
      onEditSchedule={handleEditSchedule}
      onDeleteSchedule={handleDeleteSchedule}
      onToggleSchedule={handleToggleSchedule}
    />
  );
};

const meta = {
  title: 'Options/SchedulesTab',
  component: SchedulesTab,
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
    settings: DEFAULT_SETTINGS,
    vision: DEFAULT_VISION,
    onAddSchedule: () => {},
    onEditSchedule: () => {},
    onDeleteSchedule: () => {},
    onToggleSchedule: () => {}
  }
} satisfies Meta<typeof SchedulesTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SchedulesTabWrapper />
};

export const Empty: Story = {
  render: () => (
    <SchedulesTab
      settings={DEFAULT_SETTINGS}
      vision={DEFAULT_VISION}
      onAddSchedule={() => alert('Add schedule')}
      onEditSchedule={() => {}}
      onDeleteSchedule={() => {}}
      onToggleSchedule={() => {}}
    />
  )
};
