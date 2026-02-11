import React, { useEffect, useMemo, useState } from 'react';

import { Card } from '~/components/ui';
import { CURRENT_TIME_REFRESH_MS } from '~/constants/intervals';
import { getMessage } from '~/lib/i18n';
import { normalizeEndTime } from '~/lib/time';
import type { Schedule, VisionSettings } from '~/types/storage';

// Predefined colors for schedule blocks
const SCHEDULE_COLORS = [
  { bg: 'bg-info-100', border: 'border-info-300', text: 'text-info-800' },
  {
    bg: 'bg-premium-100',
    border: 'border-premium-300',
    text: 'text-premium-800'
  },
  {
    bg: 'bg-success-100',
    border: 'border-success-300',
    text: 'text-success-800'
  },
  { bg: 'bg-block-100', border: 'border-block-300', text: 'text-block-800' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
  { bg: 'bg-danger-100', border: 'border-danger-300', text: 'text-danger-800' }
];

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0-24

interface WeeklyCalendarProps {
  schedules: Schedule[];
  vision: VisionSettings | undefined;
  onScheduleClick: (schedule: Schedule) => void;
}

interface ScheduleBlock {
  schedule: Schedule;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  colorIndex: number;
}

function parseTime(time: string): { hour: number; minute: number } {
  // Handle "24:00" as end of day
  if (time === '24:00') return { hour: 24, minute: 0 };
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

function getScheduleBlocksForDay(
  schedules: Schedule[],
  dayIndex: number,
  colorMap: Map<string, number>
): ScheduleBlock[] {
  return schedules
    .filter((s) => s.days.includes(dayIndex))
    .map((schedule) => {
      const start = parseTime(schedule.startTime);
      const end = parseTime(normalizeEndTime(schedule.endTime));
      return {
        schedule,
        startHour: start.hour,
        startMinute: start.minute,
        endHour: end.hour,
        endMinute: end.minute,
        colorIndex: colorMap.get(schedule.id) ?? 0
      };
    });
}

function getBlockStyle(block: ScheduleBlock): React.CSSProperties {
  const startPercent =
    ((block.startHour * 60 + block.startMinute) / (24 * 60)) * 100;
  const endPercent = ((block.endHour * 60 + block.endMinute) / (24 * 60)) * 100;
  const heightPercent = endPercent - startPercent;

  return {
    top: `${startPercent}%`,
    height: `${heightPercent}%`,
    minHeight: '20px'
  };
}

function useCurrentTime(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(
      () => setNow(new Date()),
      CURRENT_TIME_REFRESH_MS
    );
    return () => clearInterval(interval);
  }, []);

  return now;
}

export function WeeklyCalendar({
  schedules,
  vision,
  onScheduleClick
}: WeeklyCalendarProps) {
  const now = useCurrentTime();
  const todayDayIndex = now.getDay();
  const currentTimePercent =
    ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;

  // Create color map for schedules
  const colorMap = useMemo(() => {
    const map = new Map<string, number>();
    schedules.forEach((s, i) => {
      map.set(s.id, i % SCHEDULE_COLORS.length);
    });
    return map;
  }, [schedules]);

  // Get preset name for a schedule
  const getPresetName = (presetId: string | undefined): string | null => {
    if (!presetId || !vision?.presets) return null;
    const preset = vision.presets.find((p) => p.id === presetId);
    return preset?.name ?? null;
  };

  // Create legend items
  const legendItems = useMemo(() => {
    return schedules.map((s) => ({
      id: s.id,
      name: s.name,
      colorIndex: colorMap.get(s.id) ?? 0,
      enabled: s.enabled
    }));
  }, [schedules, colorMap]);

  if (schedules.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {getMessage('weeklyCalendar')}
      </h2>

      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header Row - Days */}
        <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
          <div className="p-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200">
            {/* Empty cell for time column */}
          </div>
          {DAY_KEYS.map((day, index) => {
            const isToday = index === todayDayIndex;
            return (
              <div
                key={day}
                className={`p-2 text-center text-xs font-medium border-r border-gray-200 last:border-r-0 ${
                  isToday
                    ? 'text-danger-600 bg-danger-50 font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {getMessage(day)}
              </div>
            );
          })}
        </div>

        {/* Calendar Body */}
        <div className="relative grid grid-cols-8" style={{ height: '400px' }}>
          {/* Time Labels Column */}
          <div className="relative border-r border-gray-200">
            {HOURS.filter((h) => h % 3 === 0).map((hour) => {
              const translateClass =
                hour === 0
                  ? ''
                  : hour === 24
                    ? '-translate-y-full'
                    : '-translate-y-1/2';
              return (
                <div
                  key={hour}
                  className={`absolute left-0 right-0 text-right pr-2 text-xs text-gray-400 transform ${translateClass}`}
                  style={{ top: `${(hour / 24) * 100}%` }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {/* Day Columns */}
          {DAY_KEYS.map((day, dayIndex) => {
            const blocks = getScheduleBlocksForDay(
              schedules,
              dayIndex,
              colorMap
            );

            return (
              <div
                key={day}
                className="relative border-r border-gray-200 last:border-r-0"
              >
                {/* Hour grid lines */}
                {HOURS.filter((h) => h % 3 === 0 && h < 24).map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${(hour / 24) * 100}%` }}
                  />
                ))}

                {/* Current time indicator */}
                {dayIndex === todayDayIndex && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: `${currentTimePercent}%` }}
                  >
                    <div className="relative flex items-center">
                      <div className="absolute -left-1 w-2.5 h-2.5 bg-danger-500 rounded-full" />
                      <div className="w-full h-0.5 bg-danger-500" />
                    </div>
                  </div>
                )}

                {/* Schedule Blocks */}
                {blocks.map((block) => {
                  const colors = SCHEDULE_COLORS[block.colorIndex];
                  const presetName = getPresetName(block.schedule.presetId);

                  return (
                    <div
                      key={block.schedule.id}
                      className={`absolute left-0.5 right-0.5 rounded border cursor-pointer transition-opacity hover:opacity-80 ${colors.bg} ${colors.border} ${
                        !block.schedule.enabled ? 'opacity-40' : ''
                      }`}
                      style={getBlockStyle(block)}
                      onClick={() => onScheduleClick(block.schedule)}
                      title={`${block.schedule.name}\n${block.schedule.startTime} - ${block.schedule.endTime}${presetName ? `\n${getMessage('presetLabel')}: ${presetName}` : ''}`}
                    >
                      <div
                        className={`p-1 text-xs truncate ${colors.text} ${
                          !block.schedule.enabled ? 'line-through' : ''
                        }`}
                      >
                        {presetName || block.schedule.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {legendItems.map((item) => {
          const colors = SCHEDULE_COLORS[item.colorIndex];
          return (
            <div
              key={item.id}
              className={`flex items-center gap-1.5 ${!item.enabled ? 'opacity-50' : ''}`}
            >
              <div
                className={`w-3 h-3 rounded ${colors.bg} ${colors.border} border`}
              />
              <span
                className={`text-xs text-gray-600 ${!item.enabled ? 'line-through' : ''}`}
              >
                {item.name}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
