import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSchedules, type ScheduleFormData } from '~/hooks/useSchedules';
import type { AppSettings, Schedule } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';

// Mock dependencies
vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  settingsItem: {
    setValue: vi.fn()
  }
}));

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

import { sendMessage } from '~/lib/messaging';
import { trackFeatureUse } from '~/lib/analytics';
import { getSettings, settingsItem } from '~/lib/storage';

describe('useSchedules', () => {
  const mockSetSettings = vi.fn();

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態でモーダルが非表示', () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );
      expect(result.current.showScheduleModal).toBe(false);
    });

    it('初期状態で編集中のスケジュールがnull', () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );
      expect(result.current.editingSchedule).toBeNull();
    });

    it('初期状態でフォームがデフォルト値', () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      expect(result.current.scheduleForm).toEqual({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5],
        presetId: ''
      });
    });
  });

  describe('setShowScheduleModal', () => {
    it('モーダルの表示状態を更新できる', () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setShowScheduleModal(true);
      });

      expect(result.current.showScheduleModal).toBe(true);
    });
  });

  describe('setScheduleForm', () => {
    it('フォームを更新できる', () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      const newForm: ScheduleFormData = {
        name: 'Evening',
        startTime: '18:00',
        endTime: '22:00',
        days: [0, 6],
        presetId: 'preset-2'
      };

      act(() => {
        result.current.setScheduleForm(newForm);
      });

      expect(result.current.scheduleForm).toEqual(newForm);
    });
  });

  describe('openAddSchedule', () => {
    it('新規作成モードでモーダルを開く', () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.openAddSchedule();
      });

      expect(result.current.showScheduleModal).toBe(true);
      expect(result.current.editingSchedule).toBeNull();
      expect(result.current.scheduleForm).toEqual({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5],
        presetId: ''
      });
    });
  });

  describe('openEditSchedule', () => {
    it('編集モードでモーダルを開く', () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

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

    it('presetIdがundefinedの場合、空文字に変換', () => {
      const scheduleWithoutPreset: Schedule = {
        ...mockSchedule,
        presetId: undefined
      };

      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.openEditSchedule(scheduleWithoutPreset);
      });

      expect(result.current.scheduleForm.presetId).toBe('');
    });
  });

  describe('handleSaveSchedule', () => {
    beforeEach(() => {
      vi.mocked(settingsItem.setValue).mockResolvedValue(undefined);
      // crypto.randomUUID のモック
      vi.stubGlobal('crypto', {
        ...global.crypto,
        randomUUID: vi.fn(() => 'new-schedule-id')
      });
    });

    it('settingsがundefinedの場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: undefined, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(settingsItem.setValue).not.toHaveBeenCalled();
    });

    it('名前が空の場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setScheduleForm({
          name: '   ',
          startTime: '09:00',
          endTime: '17:00',
          days: [1, 2, 3, 4, 5],
          presetId: ''
        });
      });

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(settingsItem.setValue).not.toHaveBeenCalled();
    });

    it('新規作成時、スケジュールを追加', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm({
          name: 'Evening',
          startTime: '18:00',
          endTime: '22:00',
          days: [0, 6],
          presetId: 'preset-2'
        });
      });

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      const expectedSettings = {
        ...mockSettings,
        schedules: [
          mockSchedule,
          {
            id: 'new-schedule-id',
            name: 'Evening',
            startTime: '18:00',
            endTime: '22:00',
            days: [0, 6],
            enabled: true,
            presetId: 'preset-2'
          }
        ]
      };

      expect(settingsItem.setValue).toHaveBeenCalledWith(expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
      expect(trackFeatureUse).toHaveBeenCalledWith('schedule_create');
      expect(result.current.showScheduleModal).toBe(false);
      expect(result.current.editingSchedule).toBeNull();
    });

    it('新規作成時、presetIdが空の場合はundefinedに変換', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm({
          name: 'Evening',
          startTime: '18:00',
          endTime: '22:00',
          days: [0, 6],
          presetId: ''
        });
      });

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      const savedSchedule = vi.mocked(settingsItem.setValue).mock.calls[0][0];
      expect(savedSchedule.schedules[1].presetId).toBeUndefined();
    });

    it('編集時、既存のスケジュールを更新', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.openEditSchedule(mockSchedule);
        result.current.setScheduleForm({
          name: 'Updated Work Hours',
          startTime: '08:00',
          endTime: '18:00',
          days: [1, 2, 3, 4, 5],
          presetId: 'preset-1'
        });
      });

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      const expectedSettings = {
        ...mockSettings,
        schedules: [
          {
            id: 'schedule-1',
            name: 'Updated Work Hours',
            startTime: '08:00',
            endTime: '18:00', // normalizeEndTime は '18:00' をそのまま返す
            days: [1, 2, 3, 4, 5],
            enabled: true,
            presetId: 'preset-1'
          }
        ]
      };

      expect(settingsItem.setValue).toHaveBeenCalledWith(expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
      expect(trackFeatureUse).not.toHaveBeenCalled(); // 編集時は呼ばれない
      expect(result.current.showScheduleModal).toBe(false);
      expect(result.current.editingSchedule).toBeNull();
    });

    it('endTimeが00:00の場合、24:00に正規化される', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.openAddSchedule();
        result.current.setScheduleForm({
          name: 'All Day',
          startTime: '00:00',
          endTime: '00:00',
          // 既存（月〜金）と曜日を重ねない。ここで見るのは終了時刻の正規化
          days: [0, 6],
          presetId: ''
        });
      });

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      const savedSchedule = vi.mocked(settingsItem.setValue).mock.calls[0][0];
      expect(savedSchedule.schedules[1].endTime).toBe('24:00');
    });

    describe('既存のスケジュールと時間帯が重なるとき', () => {
      it('保存せずエラーを返し、モーダルを開いたままにする', async () => {
        const { result } = renderHook(() =>
          useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
        );

        act(() => {
          result.current.openAddSchedule();
          result.current.setScheduleForm({
            name: 'Overlapping',
            startTime: '10:00',
            endTime: '13:00',
            days: [1],
            presetId: ''
          });
        });

        await act(async () => {
          await result.current.handleSaveSchedule();
        });

        expect(settingsItem.setValue).not.toHaveBeenCalled();
        expect(mockSetSettings).not.toHaveBeenCalled();
        expect(trackFeatureUse).not.toHaveBeenCalled();
        expect(result.current.scheduleError).toBe('scheduleOverlapError');
        expect(result.current.showScheduleModal).toBe(true);
      });

      it('無効な既存スケジュールとも重なりとみなす', async () => {
        const disabledSettings: AppSettings = {
          ...mockSettings,
          schedules: [{ ...mockSchedule, enabled: false }]
        };

        const { result } = renderHook(() =>
          useSchedules({
            settings: disabledSettings,
            setSettings: mockSetSettings
          })
        );

        act(() => {
          result.current.openAddSchedule();
          result.current.setScheduleForm({
            name: 'Overlapping',
            startTime: '10:00',
            endTime: '13:00',
            days: [1],
            presetId: ''
          });
        });

        await act(async () => {
          await result.current.handleSaveSchedule();
        });

        expect(settingsItem.setValue).not.toHaveBeenCalled();
        expect(result.current.scheduleError).toBe('scheduleOverlapError');
      });

      it('フォームを変更するとエラーが消える', async () => {
        const { result } = renderHook(() =>
          useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
        );

        act(() => {
          result.current.openAddSchedule();
          result.current.setScheduleForm({
            name: 'Overlapping',
            startTime: '10:00',
            endTime: '13:00',
            days: [1],
            presetId: ''
          });
        });

        await act(async () => {
          await result.current.handleSaveSchedule();
        });

        expect(result.current.scheduleError).toBe('scheduleOverlapError');

        act(() => {
          result.current.setScheduleForm({
            ...result.current.scheduleForm,
            days: [0]
          });
        });

        expect(result.current.scheduleError).toBeNull();
      });

      it('重なりを解消すれば保存できる', async () => {
        const { result } = renderHook(() =>
          useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
        );

        act(() => {
          result.current.openAddSchedule();
          result.current.setScheduleForm({
            name: 'Overlapping',
            startTime: '10:00',
            endTime: '13:00',
            days: [1],
            presetId: ''
          });
        });

        await act(async () => {
          await result.current.handleSaveSchedule();
        });

        // 既存（月〜金 09:00-17:00）と接するだけの時間帯に直す
        act(() => {
          result.current.setScheduleForm({
            ...result.current.scheduleForm,
            startTime: '17:00',
            endTime: '19:00'
          });
        });

        await act(async () => {
          await result.current.handleSaveSchedule();
        });

        expect(settingsItem.setValue).toHaveBeenCalledTimes(1);
        expect(result.current.scheduleError).toBeNull();
        expect(result.current.showScheduleModal).toBe(false);
      });

      it('編集時は自分自身を重なりとみなさない', async () => {
        const { result } = renderHook(() =>
          useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
        );

        act(() => {
          result.current.openEditSchedule(mockSchedule);
          result.current.setScheduleForm({
            name: 'Work Hours',
            startTime: '09:00',
            endTime: '17:00',
            days: [1, 2, 3, 4, 5],
            presetId: 'preset-1'
          });
        });

        await act(async () => {
          await result.current.handleSaveSchedule();
        });

        expect(settingsItem.setValue).toHaveBeenCalledTimes(1);
        expect(result.current.scheduleError).toBeNull();
      });

      it('編集時、自分以外と重なれば保存しない', async () => {
        const otherSchedule: Schedule = {
          id: 'schedule-2',
          name: 'Evening',
          startTime: '18:00',
          endTime: '22:00',
          days: [1],
          enabled: true
        };
        const twoSchedules: AppSettings = {
          ...mockSettings,
          schedules: [mockSchedule, otherSchedule]
        };

        const { result } = renderHook(() =>
          useSchedules({ settings: twoSchedules, setSettings: mockSetSettings })
        );

        act(() => {
          result.current.openEditSchedule(mockSchedule);
          result.current.setScheduleForm({
            name: 'Work Hours',
            startTime: '09:00',
            endTime: '19:00',
            days: [1],
            presetId: 'preset-1'
          });
        });

        await act(async () => {
          await result.current.handleSaveSchedule();
        });

        expect(settingsItem.setValue).not.toHaveBeenCalled();
        expect(result.current.scheduleError).toBe('scheduleOverlapError');
      });
    });
  });

  describe('handleDeleteSchedule', () => {
    beforeEach(() => {
      vi.mocked(settingsItem.setValue).mockResolvedValue(undefined);
    });

    it('settingsがundefinedの場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: undefined, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleDeleteSchedule('schedule-1');
      });

      expect(settingsItem.setValue).not.toHaveBeenCalled();
    });

    it('指定したIDのスケジュールを削除', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleDeleteSchedule('schedule-1');
      });

      const expectedSettings = {
        ...mockSettings,
        schedules: []
      };

      expect(settingsItem.setValue).toHaveBeenCalledWith(expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
    });

    it('存在しないIDの場合、何も削除しない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleDeleteSchedule('non-existent-id');
      });

      const expectedSettings = {
        ...mockSettings,
        schedules: [mockSchedule]
      };

      expect(settingsItem.setValue).toHaveBeenCalledWith(expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
    });
  });

  describe('handleToggleSchedule', () => {
    beforeEach(() => {
      vi.mocked(settingsItem.setValue).mockResolvedValue(undefined);
    });

    it('settingsがundefinedの場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: undefined, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleToggleSchedule('schedule-1', false);
      });

      expect(settingsItem.setValue).not.toHaveBeenCalled();
    });

    it('スケジュールのenabledを切り替え', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleToggleSchedule('schedule-1', false);
      });

      const expectedSettings = {
        ...mockSettings,
        paused: false, // enabled=false の場合は paused に影響しない
        schedules: [{ ...mockSchedule, enabled: false }]
      };

      expect(settingsItem.setValue).toHaveBeenCalledWith(expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
      expect(trackFeatureUse).toHaveBeenCalledWith('schedule_toggle');
    });

    describe('一時停止中にスケジュールを有効化したとき', () => {
      const pausedSettings: AppSettings = {
        ...mockSettings,
        paused: true,
        schedules: [{ ...mockSchedule, enabled: false }]
      };

      const resumedSettings: AppSettings = {
        ...pausedSettings,
        paused: false,
        schedules: [{ ...mockSchedule, enabled: true }]
      };

      beforeEach(() => {
        vi.mocked(sendMessage).mockResolvedValue({
          success: true,
          paused: false
        });
        vi.mocked(getSettings).mockResolvedValue(resumedSettings);
      });

      it('一時停止の解除は toggle-pause ハンドラ経由で行う（paused を直接書かない）', async () => {
        const { result } = renderHook(() =>
          useSchedules({
            settings: pausedSettings,
            setSettings: mockSetSettings
          })
        );

        await act(async () => {
          await result.current.handleToggleSchedule('schedule-1', true);
        });

        // 画面から書くのはスケジュールだけで、paused は変更しない
        expect(settingsItem.setValue).toHaveBeenCalledWith({
          ...pausedSettings,
          schedules: [{ ...mockSchedule, enabled: true }]
        });
        expect(sendMessage).toHaveBeenCalledWith('toggle-pause', {
          paused: false
        });
      });

      it('解除後の設定を読み直して表示へ反映する', async () => {
        const { result } = renderHook(() =>
          useSchedules({
            settings: pausedSettings,
            setSettings: mockSetSettings
          })
        );

        await act(async () => {
          await result.current.handleToggleSchedule('schedule-1', true);
        });

        expect(mockSetSettings).toHaveBeenCalledWith(resumedSettings);
      });

      it('送信に失敗してもスケジュールの変更は残る（例外を外に投げない）', async () => {
        vi.mocked(sendMessage).mockRejectedValue(new Error('no receiver'));

        const { result } = renderHook(() =>
          useSchedules({
            settings: pausedSettings,
            setSettings: mockSetSettings
          })
        );

        await act(async () => {
          await expect(
            result.current.handleToggleSchedule('schedule-1', true)
          ).resolves.toBeUndefined();
        });

        expect(settingsItem.setValue).toHaveBeenCalledWith({
          ...pausedSettings,
          schedules: [{ ...mockSchedule, enabled: true }]
        });
        expect(trackFeatureUse).toHaveBeenCalledWith('schedule_toggle');
      });
    });

    it('一時停止していなければ toggle-pause を送らない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleToggleSchedule('schedule-1', true);
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('存在しないIDの場合、何も変更しない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleToggleSchedule('non-existent-id', false);
      });

      const expectedSettings = {
        ...mockSettings,
        paused: false,
        schedules: [mockSchedule]
      };

      expect(settingsItem.setValue).toHaveBeenCalledWith(expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
    });
  });
});
