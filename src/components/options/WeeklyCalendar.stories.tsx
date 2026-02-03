import type { Meta, StoryObj } from '@storybook/react';

import type { Schedule, VisionSettings } from '~/types/storage';

import { WeeklyCalendar } from './WeeklyCalendar';

const meta: Meta<typeof WeeklyCalendar> = {
  title: 'Options/WeeklyCalendar',
  component: WeeklyCalendar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded'
  }
};

export default meta;
type Story = StoryObj<typeof WeeklyCalendar>;

const mockVision: VisionSettings = {
  defaultSettings: {
    goalText: 'Focus on your goals',
    goalSubText: '',
    textColor: '#ffffff',
    backgroundType: 'image',
    backgroundImage: 'default-1',
    backgroundColor: '#1a1a2e',
    customBackgroundData: null,
    fontSettings: {
      family: 'inter',
      size: 'lg',
      weight: 'semibold'
    }
  },
  presets: [
    {
      id: 'work-preset',
      name: 'Work Mode',
      createdAt: '2026-01-01T00:00:00Z',
      goalText: 'Ship the product',
      goalSubText: '',
      textColor: '#ffffff',
      backgroundType: 'image',
      backgroundImage: 'default-2',
      backgroundColor: '#1a1a2e',
      customBackgroundData: null,
      fontSettings: {
        family: 'inter',
        size: 'lg',
        weight: 'semibold'
      }
    },
    {
      id: 'focus-preset',
      name: 'Focus Time',
      createdAt: '2026-01-01T00:00:00Z',
      goalText: 'Deep work session',
      goalSubText: '',
      textColor: '#ffffff',
      backgroundType: 'color',
      backgroundImage: '',
      backgroundColor: '#1e3a5f',
      customBackgroundData: null,
      fontSettings: {
        family: 'inter',
        size: 'lg',
        weight: 'bold'
      }
    }
  ],
  activePresetId: null
};

const mockSchedules: Schedule[] = [
  {
    id: '1',
    name: 'Work Hours',
    startTime: '09:00',
    endTime: '18:00',
    days: [1, 2, 3, 4, 5], // Mon-Fri
    enabled: true,
    presetId: 'work-preset'
  },
  {
    id: '2',
    name: 'Evening Focus',
    startTime: '20:00',
    endTime: '23:00',
    days: [0, 1, 2, 3, 4, 5, 6], // Every day
    enabled: true,
    presetId: 'focus-preset'
  }
];

export const Default: Story = {
  args: {
    schedules: mockSchedules,
    vision: mockVision,
    onScheduleClick: (schedule) => {
      alert(`Clicked: ${schedule.name}`);
    }
  }
};

export const SingleSchedule: Story = {
  args: {
    schedules: [mockSchedules[0]],
    vision: mockVision,
    onScheduleClick: (schedule) => {
      alert(`Clicked: ${schedule.name}`);
    }
  }
};

export const ManySchedules: Story = {
  args: {
    schedules: [
      ...mockSchedules,
      {
        id: '3',
        name: 'Morning Routine',
        startTime: '06:00',
        endTime: '08:00',
        days: [1, 2, 3, 4, 5],
        enabled: true
      },
      {
        id: '4',
        name: 'Weekend Study',
        startTime: '10:00',
        endTime: '14:00',
        days: [0, 6],
        enabled: true
      }
    ],
    vision: mockVision,
    onScheduleClick: (schedule) => {
      alert(`Clicked: ${schedule.name}`);
    }
  }
};

export const WithDisabledSchedule: Story = {
  args: {
    schedules: [
      mockSchedules[0],
      {
        ...mockSchedules[1],
        enabled: false
      }
    ],
    vision: mockVision,
    onScheduleClick: (schedule) => {
      alert(`Clicked: ${schedule.name}`);
    }
  }
};

export const NoSchedules: Story = {
  args: {
    schedules: [],
    vision: mockVision,
    onScheduleClick: () => {}
  }
};
