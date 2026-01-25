import React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Button, Card, Toggle } from '~/components/ui'
import { getMessage } from '~/lib/i18n'
import type { AppSettings, Schedule, VisionSettings } from '~/types/storage'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface SchedulesTabProps {
  settings: AppSettings | undefined
  vision: VisionSettings | undefined
  onAddSchedule: () => void
  onEditSchedule: (schedule: Schedule) => void
  onDeleteSchedule: (id: string) => void
  onToggleSchedule: (id: string, enabled: boolean) => void
}

export function SchedulesTab({
  settings,
  vision,
  onAddSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onToggleSchedule,
}: SchedulesTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {getMessage('blockingSchedules')}
          </h2>
          <Button onClick={onAddSchedule}>
            <Plus className="w-4 h-4 mr-1" />
            {getMessage('addSchedule')}
          </Button>
        </div>

        {settings?.schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {getMessage('noSchedules')}
          </p>
        ) : (
          <div className="space-y-3">
            {settings?.schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {schedule.name}
                    </p>
                    <Toggle
                      checked={schedule.enabled}
                      onChange={(enabled) =>
                        onToggleSchedule(schedule.id, enabled)
                      }
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {schedule.startTime} - {schedule.endTime}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {DAY_NAMES.map((day, idx) => (
                      <span
                        key={day}
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          schedule.days.includes(idx)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                  {schedule.presetId && (
                    <p className="text-xs text-primary-600 mt-1">
                      {getMessage('presetLabel')}:{' '}
                      {vision?.presets?.find((p) => p.id === schedule.presetId)
                        ?.name || getMessage('unknownPreset')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditSchedule(schedule)}
                  >
                    {getMessage('edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteSchedule(schedule.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
