import { useCallback, useState } from 'react';
import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';

import { trackFeatureUse } from '~/lib/analytics';
import {
  ScheduleInputSchema,
  type ScheduleInput
} from '~/types/messageSchemas';
import type { Schedule } from '~/types/storage';

/** スケジュール編集モーダルの入力値 */
export interface ScheduleFormData {
  /** スケジュールの名前 */
  name: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm（00:00 はその日の終わりとして保存される） */
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

/**
 * 編集モーダルの入力値を、background に送るスケジュールの入力値の形にする（検証はしない）
 * @param form 編集モーダルの入力値
 * @returns 送る形の入力値（スタイルを指定しないときは presetId を持たない）
 */
export function toScheduleInput(form: ScheduleFormData): ScheduleInput {
  return {
    name: form.name,
    startTime: form.startTime,
    endTime: form.endTime,
    days: form.days,
    presetId: form.presetId || undefined
  };
}

/**
 * 編集モーダルの入力値が、background の検証（ScheduleInputSchema）を通る形か
 * @param form 編集モーダルの入力値
 * @returns 通るなら true
 */
export function isScheduleFormValid(form: ScheduleFormData): boolean {
  return ScheduleInputSchema.safeParse(toScheduleInput(form)).success;
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
  /** 入力値の追加・置き換えを background に依頼する。拒まれたらモーダルを開いたまま scheduleError に文言を入れる */
  handleSaveSchedule: () => Promise<void>;
  /** id のスケジュールの削除を background に依頼する（失敗しても一覧は保存値のまま） */
  handleDeleteSchedule: (id: string) => Promise<void>;
  /** id のスケジュールの有効・無効の切り替えを background に依頼する（失敗しても一覧は保存値のまま） */
  handleToggleSchedule: (id: string, enabled: boolean) => Promise<void>;
  /** schedule の値を入力値にして編集モーダルを開く */
  openEditSchedule: (schedule: Schedule) => void;
  /** 既定の入力値で新規作成の編集モーダルを開く */
  openAddSchedule: () => void;
}

/**
 * スケジュール画面の編集モーダルの状態と、保存・削除・有効切り替えを background へ依頼する操作を提供する（表示は保存値の購読で追従する）
 * @returns 編集モーダルの状態と各操作
 */
export function useSchedules(): UseSchedulesReturn {
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
    const parsed = ScheduleInputSchema.safeParse(toScheduleInput(scheduleForm));
    if (!parsed.success) return;

    try {
      const response = editingSchedule
        ? await sendMessage('update-schedule', {
            id: editingSchedule.id,
            schedule: parsed.data
          })
        : await sendMessage('add-schedule', { schedule: parsed.data });

      if (!response.success) {
        setScheduleError(messageErrorText(response.error));
        return;
      }
    } catch {
      setScheduleError(messageErrorText(undefined));
      return;
    }

    if (!editingSchedule) {
      trackFeatureUse('schedule_create');
    }

    setShowScheduleModal(false);
    setEditingSchedule(null);
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
  }, [scheduleForm, setScheduleForm, editingSchedule]);

  const handleDeleteSchedule = useCallback(async (id: string) => {
    await sendMessage('remove-schedule', { id }).catch(() => undefined);
  }, []);

  const handleToggleSchedule = useCallback(
    async (id: string, enabled: boolean) => {
      const response = await sendMessage('toggle-schedule', {
        id,
        enabled
      }).catch(() => undefined);
      if (response?.success) {
        trackFeatureUse('schedule_toggle');
      }
    },
    []
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
