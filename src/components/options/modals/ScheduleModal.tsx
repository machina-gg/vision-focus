import React from 'react';

import { Button, Input, Modal } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { Schedule, VisionSettings } from '~/types/storage';
import type { ScheduleFormData } from '~/hooks/useSchedules';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** ScheduleModal に渡す開閉状態・フォームの内容と操作 */
interface ScheduleModalProps {
  /** false の間は表示しない */
  isOpen: boolean;
  /** 取消ボタンか背景が押されたときに呼ぶ */
  onClose: () => void;
  /** 編集中のスケジュール（null なら新規追加として見出しとボタンを出す） */
  editingSchedule: Schedule | null;
  /** フォームに入っている名前・時間帯・曜日・プリセット */
  scheduleForm: ScheduleFormData;
  /** どれかの欄が変わったときに変更後のフォーム全体を受け取る（曜日は昇順に並べ直す） */
  onFormChange: (form: ScheduleFormData) => void;
  /** 保存ボタンが押されたときに呼ぶ */
  onSave: () => void;
  /** プリセットの選択肢を引く表示設定（読み込み前は undefined で、選択肢は「なし」だけ） */
  vision: VisionSettings | undefined;
  /** 保存できない理由（null か省略なら出さない） */
  error?: string | null;
}

/**
 * スケジュールの名前・開始と終了の時刻・曜日・適用するプリセットを入力させるモーダルを表示する
 * @param props 開閉状態・フォームの内容と操作（各フィールドは ScheduleModalProps）
 * @returns スケジュールの追加・編集のモーダル
 */
export function ScheduleModal({
  isOpen,
  onClose,
  editingSchedule,
  scheduleForm,
  onFormChange,
  onSave,
  vision,
  error
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
            data-testid="schedule-name-input"
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
              data-testid="schedule-start-time"
              type="time"
              value={scheduleForm.startTime}
              onChange={(e) =>
                onFormChange({ ...scheduleForm, startTime: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getMessage('endTime')}
            </label>
            <input
              data-testid="schedule-end-time"
              type="time"
              value={
                scheduleForm.endTime === '24:00'
                  ? '00:00'
                  : scheduleForm.endTime
              }
              onChange={(e) =>
                onFormChange({ ...scheduleForm, endTime: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {getMessage('activeDays')}
          </label>
          <div className="flex gap-2">
            {DAY_KEYS.map((day, idx) => (
              <button
                key={day}
                data-testid="schedule-day-button"
                aria-pressed={scheduleForm.days.includes(idx)}
                onClick={() => toggleDay(idx)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scheduleForm.days.includes(idx)
                    ? 'bg-info-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getMessage(day)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {getMessage('schedulePreset')}
          </label>
          <select
            data-testid="schedule-preset-select"
            value={scheduleForm.presetId}
            onChange={(e) =>
              onFormChange({ ...scheduleForm, presetId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="">{getMessage('noPresetSelected')}</option>
            {vision?.presets?.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {getMessage('schedulePresetDescription')}
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger-600" data-testid="schedule-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            data-testid="schedule-cancel-button"
          >
            {getMessage('cancel')}
          </Button>
          <Button
            onClick={onSave}
            disabled={!scheduleForm.name.trim()}
            data-testid="schedule-save-button"
          >
            {editingSchedule
              ? getMessage('saveChanges')
              : getMessage('addSchedule')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
