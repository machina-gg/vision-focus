import { useCallback, useState } from 'react';
import { sendMessage } from '~/lib/messaging';

import { trackFeatureUse } from '~/lib/analytics';
import { getMessage } from '~/lib/i18n';
import { findOverlappingSchedule } from '~/lib/scheduleOverlap';
import { getSettings, settingsItem } from '~/lib/storage';
import { normalizeEndTime } from '~/lib/time';
import type { AppSettings, Schedule } from '~/types/storage';

/** スケジュール編集モーダルの入力値 */
export interface ScheduleFormData {
  /** スケジュールの名前。空白だけなら保存しない */
  name: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm。00:00 は保存時に 24:00（その日の終わり）へ直す */
  endTime: string;
  /** 曜日（0 = 日曜 … 6 = 土曜） */
  days: number[];
  /** 空文字 = スタイルを指定しない */
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
  /** 今のアプリ設定。読み込み前は undefined（操作は何もしない） */
  settings: AppSettings | undefined;
  /** 保存したあと画面側のアプリ設定を差し替える */
  setSettings: (settings: AppSettings) => void;
}

interface UseSchedulesReturn {
  /** 編集モーダルを表示中か */
  showScheduleModal: boolean;
  /** 編集モーダルを開閉する */
  setShowScheduleModal: (show: boolean) => void;
  /** 編集中のスケジュール。新規作成中なら null */
  editingSchedule: Schedule | null;
  /** 編集モーダルの入力値 */
  scheduleForm: ScheduleFormData;
  /** 編集モーダルの入力値を変える（失敗の文言は消える） */
  setScheduleForm: (form: ScheduleFormData) => void;
  /** 保存に失敗したときの文言。失敗していなければ null */
  scheduleError: string | null;
  /** 入力値を保存する。他のスケジュールと重なるなら保存せず scheduleError に文言を入れる */
  handleSaveSchedule: () => Promise<void>;
  /** id のスケジュールを消す */
  handleDeleteSchedule: (id: string) => Promise<void>;
  /** id のスケジュールの有効・無効を切り替える。一時停止中に有効にしたら一時停止も解く */
  handleToggleSchedule: (id: string, enabled: boolean) => Promise<void>;
  /** schedule の値を入力値にして編集モーダルを開く */
  openEditSchedule: (schedule: Schedule) => void;
  /** 既定の入力値で新規作成の編集モーダルを開く */
  openAddSchedule: () => void;
}

/**
 * スケジュール画面の編集モーダルの状態と、保存（重なりの検査つき）・削除・有効切り替えの操作を提供する
 * @param options フックの入力（下記の項目）
 * @param options.settings 今のアプリ設定。読み込み前は undefined
 * @param options.setSettings 保存したあと画面側のアプリ設定を差し替える関数
 * @returns 編集モーダルの状態と各操作
 */
export function useSchedules({
  settings,
  setSettings
}: UseSchedulesOptions): UseSchedulesReturn {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleFormState] = useState<ScheduleFormData>(
    DEFAULT_SCHEDULE_FORM
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const setScheduleForm = useCallback((form: ScheduleFormData) => {
    setScheduleFormState(form);
    setScheduleError(null);
  }, []);

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

    const overlapping = findOverlappingSchedule(
      newSchedule,
      settings.schedules,
      editingSchedule?.id
    );
    if (overlapping) {
      setScheduleError(getMessage('scheduleOverlapError'));
      return;
    }

    const updatedSchedules = editingSchedule
      ? settings.schedules.map((s) =>
          s.id === editingSchedule.id ? newSchedule : s
        )
      : [...settings.schedules, newSchedule];

    const updated = { ...settings, schedules: updatedSchedules };
    await settingsItem.setValue(updated);
    setSettings(updated);

    if (!editingSchedule) {
      trackFeatureUse('schedule_create');
    }

    setShowScheduleModal(false);
    setEditingSchedule(null);
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
  }, [settings, setSettings, scheduleForm, setScheduleForm, editingSchedule]);

  const handleDeleteSchedule = useCallback(
    async (id: string) => {
      if (!settings) return;
      const updated = {
        ...settings,
        schedules: settings.schedules.filter((s) => s.id !== id)
      };
      await settingsItem.setValue(updated);
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
      await settingsItem.setValue(updated);
      setSettings(updated);

      // paused は toggle-pause 経由で解除する（画面から直接書くと開いているタブがブロックされない）
      if (enabled && settings.paused) {
        await resumeBlocking(setSettings);
      }

      trackFeatureUse('schedule_toggle');
    },
    [settings, setSettings]
  );

  const openEditSchedule = useCallback(
    (schedule: Schedule) => {
      setEditingSchedule(schedule);
      setScheduleForm({
        name: schedule.name,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        days: schedule.days,
        presetId: schedule.presetId || ''
      });
      setShowScheduleModal(true);
    },
    [setScheduleForm]
  );

  const openAddSchedule = useCallback(() => {
    setEditingSchedule(null);
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
    setShowScheduleModal(true);
  }, [setScheduleForm]);

  return {
    showScheduleModal,
    setShowScheduleModal,
    editingSchedule,
    scheduleForm,
    setScheduleForm,
    scheduleError,
    handleSaveSchedule,
    handleDeleteSchedule,
    handleToggleSchedule,
    openEditSchedule,
    openAddSchedule
  };
}

async function resumeBlocking(
  setSettings: (settings: AppSettings) => void
): Promise<void> {
  try {
    await sendMessage('toggle-pause', { paused: false });
    setSettings(await getSettings());
  } catch {
    // 送信に失敗しても、スケジュールの変更自体は保存済みのため表示は保つ
  }
}
