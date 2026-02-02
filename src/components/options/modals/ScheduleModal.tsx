import React from 'react';
import { Lock } from 'lucide-react';

import { Button, Input, Modal } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { Schedule, VisionSettings } from '~/types/storage';
import type { FeatureLimits } from '~/types/premium';
import type { ScheduleFormData } from '~/hooks/useSchedules';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSchedule: Schedule | null;
  scheduleForm: ScheduleFormData;
  onFormChange: (form: ScheduleFormData) => void;
  onSave: () => void;
  vision: VisionSettings | undefined;
  isPremium: boolean;
  featureLimits: FeatureLimits;
}

export function ScheduleModal({
  isOpen,
  onClose,
  editingSchedule,
  scheduleForm,
  onFormChange,
  onSave,
  vision,
  isPremium,
  featureLimits
}: ScheduleModalProps) {
  const toggleDay = (day: number) => {
    const newDays = scheduleForm.days.includes(day)
      ? scheduleForm.days.filter((d) => d !== day)
      : [...scheduleForm.days, day].sort();
    onFormChange({ ...scheduleForm, days: newDays });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingSchedule ? getMessage('editSchedule') : getMessage('addSchedule')
      }
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {getMessage('scheduleName')}
          </label>
          <Input
            value={scheduleForm.name}
            onChange={(value) => onFormChange({ ...scheduleForm, name: value })}
            placeholder=""
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getMessage('startTime')}
            </label>
            <input
              type="time"
              value={scheduleForm.startTime}
              onChange={(e) =>
                onFormChange({ ...scheduleForm, startTime: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getMessage('endTime')}
            </label>
            <input
              type="time"
              value={scheduleForm.endTime}
              onChange={(e) =>
                onFormChange({ ...scheduleForm, endTime: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {getMessage('activeDays')}
          </label>
          <div className="flex gap-2">
            {DAY_NAMES.map((day, idx) => (
              <button
                key={day}
                onClick={() => toggleDay(idx)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scheduleForm.days.includes(idx)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {getMessage('schedulePreset')}
          </label>
          <select
            value={scheduleForm.presetId}
            onChange={(e) =>
              onFormChange({ ...scheduleForm, presetId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">{getMessage('noPresetSelected')}</option>
            {vision?.presets?.map((preset, index) => {
              const isLocked = !isPremium && index >= featureLimits.maxPresets;
              return (
                <option key={preset.id} value={preset.id} disabled={isLocked}>
                  {isLocked ? `🔒 ${preset.name}` : preset.name}
                </option>
              );
            })}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {getMessage('schedulePresetDescription')}
          </p>
          {/* Warning if selected preset is locked */}
          {!isPremium &&
            scheduleForm.presetId &&
            vision?.presets &&
            vision.presets.findIndex((p) => p.id === scheduleForm.presetId) >=
              featureLimits.maxPresets && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-2">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{getMessage('scheduleLockedPresetWarning')}</span>
              </div>
            )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>
            {getMessage('cancel')}
          </Button>
          <Button onClick={onSave} disabled={!scheduleForm.name.trim()}>
            {editingSchedule
              ? getMessage('saveChanges')
              : getMessage('addSchedule')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
