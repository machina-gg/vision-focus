import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  isScheduleFormValid,
  toScheduleInput,
  useSchedules,
  type ScheduleFormData
} from '~/hooks/useSchedules';
import { getMessage } from '~/lib/i18n';
import { AddScheduleBodySchema } from '~/types/messageSchemas';
import type { AppSettings, Schedule } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  settingsItem: {
    setValue: vi.fn()
  }
}));

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

import { sendMessage } from '~/lib/messaging';
import { trackFeatureUse } from '~/lib/analytics';
import { settingsItem } from '~/lib/storage';
import { itemAt } from '~/test/items';

const mockSchedule: Schedule = {
  id: 'schedule-1',
  name: 'Work Hours',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3, 4, 5],
  enabled: true,
  presetId: 'preset-1'
};

const mockSettings: AppSettings = {
  ...DEFAULT_SETTINGS,
  schedules: [mockSchedule]
};

const DEFAULT_FORM: ScheduleFormData = {
  name: '',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3, 4, 5],
  presetId: ''
};

const VALID_FORM: ScheduleFormData = {
  name: 'Morning',
  startTime: '06:00',
  endTime: '08:00',
  days: [1],
  presetId: ''
};

function render(settings: AppSettings | undefined = mockSettings) {
  return renderHook(() => useSchedules({ settings }));
}

describe('useSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
  });

  describe('初期状態', () => {
    it('モーダルは閉じていて、編集中のスケジュールは無く、フォームは既定値', () => {
      const { result } = render();

      expect(result.current.showScheduleModal).toBe(false);
      expect(result.current.editingSchedule).toBeNull();
      expect(result.current.scheduleForm).toEqual(DEFAULT_FORM);
      expect(result.current.scheduleError).toBeNull();
    });
  });

  describe('setShowScheduleModal', () => {
    it('モーダルの表示状態を更新できる', () => {
      const { result } = render();

      act(() => {
        result.current.setShowScheduleModal(true);
      });

      expect(result.current.showScheduleModal).toBe(true);
    });
  });

  describe('openAddSchedule', () => {
    it('既定の入力値で新規作成のモーダルを開く', () => {
      const { result } = render();

      act(() => {
        result.current.setScheduleForm(VALID_FORM);
        result.current.openAddSchedule();
      });

      expect(result.current.showScheduleModal).toBe(true);
      expect(result.current.editingSchedule).toBeNull();
      expect(result.current.scheduleForm).toEqual(DEFAULT_FORM);
    });
  });

  describe('openEditSchedule', () => {
    it('スケジュールの値を入力値にして編集のモーダルを開く', () => {
      const { result } = render();

      act(() => {
        result.current.openEditSchedule(mockSchedule);
      });

      expect(result.current.showScheduleModal).toBe(true);
      expect(result.current.editingSchedule).toEqual(mockSchedule);
      expect(result.current.scheduleForm).toEqual({
        name: 'Work Hours',
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5],
        presetId: 'preset-1'
      });
    });

    it('スタイルを指定していなければ presetId は空文字になる', () => {
      const { result } = render();

      act(() => {
        result.current.openEditSchedule({
          ...mockSchedule,
          presetId: undefined
        });
      });

      expect(result.current.scheduleForm.presetId).toBe('');
    });
  });

  describe('handleSaveSchedule', () => {
    it('設定の読み込み前は何も送らない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: undefined })
      );

      act(() => {
        result.current.setScheduleForm(VALID_FORM);
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it.each([
      ['名前が空白だけ', { ...VALID_FORM, name: '  ' }],
      ['曜日が無い', { ...VALID_FORM, days: [] }],
      ['開始時刻が空', { ...VALID_FORM, startTime: '' }]
    ])('%s なら何も送らない', async (_label, form) => {
      const { result } = render();

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm(form);
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(sendMessage).not.toHaveBeenCalled();
      expect(result.current.showScheduleModal).toBe(true);
    });

    it('新規作成なら add-schedule を送り、保存領域には書かずにモーダルを閉じる', async () => {
      const { result } = render();

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm({ ...VALID_FORM, presetId: 'preset-2' });
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(sendMessage).toHaveBeenCalledWith('add-schedule', {
        schedule: {
          name: 'Morning',
          startTime: '06:00',
          endTime: '08:00',
          days: [1],
          presetId: 'preset-2'
        }
      });
      expect(settingsItem.setValue).not.toHaveBeenCalled();
      expect(trackFeatureUse).toHaveBeenCalledWith('schedule_create');
      expect(result.current.showScheduleModal).toBe(false);
      expect(result.current.editingSchedule).toBeNull();
      expect(result.current.scheduleForm).toEqual(DEFAULT_FORM);
    });

    it('スタイルを指定しなければ presetId を送らない（空文字を送らない）', async () => {
      const { result } = render();

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm(VALID_FORM);
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      const [, body] = itemAt(vi.mocked(sendMessage).mock.calls, 0);
      expect(body).toEqual({
        schedule: {
          name: 'Morning',
          startTime: '06:00',
          endTime: '08:00',
          days: [1]
        }
      });
    });

    it('終了時刻 00:00 はそのまま送る（24:00 への読み替えは background が行う）', async () => {
      const { result } = render();

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm({ ...VALID_FORM, endTime: '00:00' });
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(sendMessage).toHaveBeenCalledWith('add-schedule', {
        schedule: expect.objectContaining({ endTime: '00:00' })
      });
    });

    it('編集なら update-schedule を ID つきで送り、有効・無効は送らない', async () => {
      const { result } = render();

      act(() => {
        result.current.openEditSchedule({ ...mockSchedule, enabled: false });
      });
      act(() => {
        result.current.setScheduleForm({
          ...result.current.scheduleForm,
          name: 'Updated'
        });
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(sendMessage).toHaveBeenCalledWith('update-schedule', {
        id: 'schedule-1',
        schedule: {
          name: 'Updated',
          startTime: '09:00',
          endTime: '17:00',
          days: [1, 2, 3, 4, 5],
          presetId: 'preset-1'
        }
      });
      expect(settingsItem.setValue).not.toHaveBeenCalled();
      expect(trackFeatureUse).not.toHaveBeenCalled();
      expect(result.current.showScheduleModal).toBe(false);
    });

    it('schedule-overlap で拒まれたら重なりの文言を出し、モーダルを閉じない', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'schedule-overlap' }
      });
      const { result } = render();

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm(VALID_FORM);
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(result.current.scheduleError).toBe(
        getMessage('scheduleOverlapError')
      );
      expect(result.current.showScheduleModal).toBe(true);
      expect(result.current.scheduleForm).toEqual(VALID_FORM);
      expect(trackFeatureUse).not.toHaveBeenCalled();
    });

    it('理由の無い失敗は既定の文言を出す', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: false });
      const { result } = render();

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm(VALID_FORM);
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(result.current.scheduleError).toBe(
        getMessage('errorOperationFailed')
      );
      expect(result.current.showScheduleModal).toBe(true);
    });

    it('送信できなかったときも既定の文言を出し、例外を外に投げない', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
      const { result } = render();

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm(VALID_FORM);
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(result.current.scheduleError).toBe(
        getMessage('errorOperationFailed')
      );
      expect(result.current.showScheduleModal).toBe(true);
    });

    it('入力を変えると失敗の文言が消える', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'schedule-overlap' }
      });
      const { result } = render();

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm(VALID_FORM);
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });
      act(() => {
        result.current.setScheduleForm({ ...VALID_FORM, days: [2] });
      });

      expect(result.current.scheduleError).toBeNull();
    });
  });

  describe('handleDeleteSchedule', () => {
    it('remove-schedule を送り、保存領域には書かない', async () => {
      const { result } = render();

      await act(async () => {
        await result.current.handleDeleteSchedule('schedule-1');
      });

      expect(sendMessage).toHaveBeenCalledWith('remove-schedule', {
        id: 'schedule-1'
      });
      expect(settingsItem.setValue).not.toHaveBeenCalled();
    });

    it('設定の読み込み前は何も送らない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: undefined })
      );

      await act(async () => {
        await result.current.handleDeleteSchedule('schedule-1');
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('送信できなくても例外を外に投げない', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
      const { result } = render();

      await expect(
        act(async () => {
          await result.current.handleDeleteSchedule('schedule-1');
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('handleToggleSchedule', () => {
    it('toggle-schedule を送り、保存領域には書かない', async () => {
      const { result } = render();

      await act(async () => {
        await result.current.handleToggleSchedule('schedule-1', false);
      });

      expect(sendMessage).toHaveBeenCalledWith('toggle-schedule', {
        id: 'schedule-1',
        enabled: false
      });
      expect(sendMessage).toHaveBeenCalledOnce();
      expect(settingsItem.setValue).not.toHaveBeenCalled();
      expect(trackFeatureUse).toHaveBeenCalledWith('schedule_toggle');
    });

    it('一時停止中に有効にしても、一時停止の解除は画面から送らない（background が行う）', async () => {
      const { result } = render({ ...mockSettings, paused: true });

      await act(async () => {
        await result.current.handleToggleSchedule('schedule-1', true);
      });

      expect(sendMessage).toHaveBeenCalledOnce();
      expect(sendMessage).toHaveBeenCalledWith('toggle-schedule', {
        id: 'schedule-1',
        enabled: true
      });
    });

    it('設定の読み込み前は何も送らない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: undefined })
      );

      await act(async () => {
        await result.current.handleToggleSchedule('schedule-1', true);
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('拒まれたら利用の記録を送らない', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'schedule-not-found' }
      });
      const { result } = render();

      await act(async () => {
        await result.current.handleToggleSchedule('missing', true);
      });

      expect(trackFeatureUse).not.toHaveBeenCalled();
    });

    it('送信できなくても例外を外に投げない', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
      const { result } = render();

      await expect(
        act(async () => {
          await result.current.handleToggleSchedule('schedule-1', true);
        })
      ).resolves.toBeUndefined();
      expect(trackFeatureUse).not.toHaveBeenCalled();
    });
  });
});

describe('toScheduleInput', () => {
  it('スタイルを指定しない入力値は presetId を持たない', () => {
    expect(toScheduleInput(VALID_FORM).presetId).toBeUndefined();
  });

  it('スタイルを指定した入力値はその ID を持つ', () => {
    expect(toScheduleInput({ ...VALID_FORM, presetId: 'p1' }).presetId).toBe(
      'p1'
    );
  });
});

describe('isScheduleFormValid', () => {
  it.each([
    [
      '既定のフォームに名前を入れたもの',
      { ...DEFAULT_FORM, name: 'Work' },
      true
    ],
    ['終了時刻 00:00', { ...VALID_FORM, endTime: '00:00' }, true],
    [
      '終了時刻 24:00（保存値を開いたとき）',
      { ...VALID_FORM, endTime: '24:00' },
      true
    ],
    ['名前が空', { ...VALID_FORM, name: '' }, false],
    ['名前が空白だけ', { ...VALID_FORM, name: '   ' }, false],
    ['曜日が無い', { ...VALID_FORM, days: [] }, false],
    ['開始時刻が空', { ...VALID_FORM, startTime: '' }, false],
    ['終了時刻が空', { ...VALID_FORM, endTime: '' }, false],
    ['開始時刻 24:00', { ...VALID_FORM, startTime: '24:00' }, false]
  ])('%s → %s', (_label, form, expected) => {
    expect(isScheduleFormValid(form)).toBe(expected);
  });
});

describe('画面の入力欄で選べる時刻で送るスケジュール', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
  });

  it.each([
    ['00:00', '23:59'],
    ['23:59', '00:00'],
    ['00:00', '00:00']
  ])(
    '開始 %s・終了 %s で送る本文は background の検証を通る',
    async (startTime, endTime) => {
      const { result } = renderHook(() =>
        useSchedules({ settings: { ...DEFAULT_SETTINGS, schedules: [] } })
      );

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm({
          name: 'Edge',
          startTime,
          endTime,
          days: [0],
          presetId: ''
        });
      });
      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      const [, body] = itemAt(vi.mocked(sendMessage).mock.calls, 0);
      expect(AddScheduleBodySchema.safeParse(body).success).toBe(true);
    }
  );
});
