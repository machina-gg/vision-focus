import { useCallback, useState } from 'react';
import { sendToBackground } from '@plasmohq/messaging';

import { trackFeatureUse } from '~/lib/analytics';
import { storage } from '~/lib/storage';
import { normalizeEndTime } from '~/lib/time';
import type { AppSettings, Schedule } from '~/types/storage';

export interface ScheduleFormData {
  name: string;
  startTime: string;
  endTime: string;
  days: number[];
  presetId: string;
}

const DEFAULT_SCHEDULE_FORM: ScheduleFormData = {
  name: '',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3, 4, 5],
  presetId: ''
};

interface UseSchedulesOptions {
  settings: AppSettings | undefined;
  setSettings: (settings: AppSettings) => void;
}

interface UseSchedulesReturn {
  showScheduleModal: boolean;
  setShowScheduleModal: (show: boolean) => void;
  editingSchedule: Schedule | null;
  scheduleForm: ScheduleFormData;
  setScheduleForm: (form: ScheduleFormData) => void;
  handleSaveSchedule: () => Promise<void>;
  handleDeleteSchedule: (id: string) => Promise<void>;
  handleToggleSchedule: (id: string, enabled: boolean) => Promise<void>;
  openEditSchedule: (schedule: Schedule) => void;
  openAddSchedule: () => void;
}

export function useSchedules({
  settings,
  setSettings
}: UseSchedulesOptions): UseSchedulesReturn {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(
    DEFAULT_SCHEDULE_FORM
  );

  const handleSaveSchedule = useCallback(async () => {
    if (!settings || !scheduleForm.name.trim()) return;

    const newSchedule: Schedule = {
      id: editingSchedule?.id || crypto.randomUUID(),
      name: scheduleForm.name,
      startTime: scheduleForm.startTime,
      endTime: normalizeEndTime(scheduleForm.endTime),
      days: scheduleForm.days,
      enabled: true,
      presetId: scheduleForm.presetId || undefined
    };

    const updatedSchedules = editingSchedule
      ? settings.schedules.map((s) =>
          s.id === editingSchedule.id ? newSchedule : s
        )
      : [...settings.schedules, newSchedule];

    const updated = { ...settings, schedules: updatedSchedules };
    await storage.set('settings', updated);
    setSettings(updated);

    if (!editingSchedule) {
      trackFeatureUse('schedule_create');
    }

    setShowScheduleModal(false);
    setEditingSchedule(null);
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
  }, [settings, setSettings, scheduleForm, editingSchedule]);

  const handleDeleteSchedule = useCallback(
    async (id: string) => {
      if (!settings) return;
      const updated = {
        ...settings,
        schedules: settings.schedules.filter((s) => s.id !== id)
      };
      await storage.set('settings', updated);
      setSettings(updated);
    },
    [settings, setSettings]
  );

  const handleToggleSchedule = useCallback(
    async (id: string, enabled: boolean) => {
      if (!settings) return;
      const updated = {
        ...settings,
        schedules: settings.schedules.map((s) =>
          s.id === id ? { ...s, enabled } : s
        )
      };
      await storage.set('settings', updated);
      setSettings(updated);

      // スケジュールを有効化したときは一時停止も解除する。
      // paused の切り替えは background の toggle-pause ハンドラに寄せる
      // （ハンドラが既存タブのブロックまで行うため。画面から直接書くと
      // 開いているタブが次の遷移までブロックされない）(#392)
      if (enabled && settings.paused) {
        await resumeBlocking(setSettings);
      }

      trackFeatureUse('schedule_toggle');
    },
    [settings, setSettings]
  );

  const openEditSchedule = useCallback((schedule: Schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      days: schedule.days,
      presetId: schedule.presetId || ''
    });
    setShowScheduleModal(true);
  }, []);

  const openAddSchedule = useCallback(() => {
    setEditingSchedule(null);
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
    setShowScheduleModal(true);
  }, []);

  return {
    showScheduleModal,
    setShowScheduleModal,
    editingSchedule,
    scheduleForm,
    setScheduleForm,
    handleSaveSchedule,
    handleDeleteSchedule,
    handleToggleSchedule,
    openEditSchedule,
    openAddSchedule
  };
}

/**
 * 一時停止を解除する（background の toggle-pause ハンドラ経由）。
 * ハンドラがブロックルールの更新と既存タブのブロックまで行う
 */
async function resumeBlocking(
  setSettings: (settings: AppSettings) => void
): Promise<void> {
  try {
    await sendToBackground({ name: 'toggle-pause', body: { paused: false } });
    const latest = await storage.get<AppSettings>('settings');
    if (latest) {
      setSettings(latest);
    }
  } catch {
    // 送信に失敗しても、スケジュールの変更自体は保存済みのため表示は保つ
  }
}
