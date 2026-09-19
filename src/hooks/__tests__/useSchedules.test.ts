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
  storage: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/time', () => ({
  normalizeEndTime: vi.fn((time: string) => (time === '00:00' ? '24:00' : time))
}));

import { sendMessage } from '~/lib/messaging';
import { trackFeatureUse } from '~/lib/analytics';
import { storage } from '~/lib/storage';

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
      vi.mocked(storage.set).mockResolvedValue(undefined);
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

      expect(storage.set).not.toHaveBeenCalled();
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

      expect(storage.set).not.toHaveBeenCalled();
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

      expect(storage.set).toHaveBeenCalledWith('settings', expectedSettings);
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

      const savedSchedule = vi.mocked(storage.set).mock
        .calls[0][1] as AppSettings;
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

      expect(storage.set).toHaveBeenCalledWith('settings', expectedSettings);
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
          days: [0, 1, 2, 3, 4, 5, 6],
          presetId: ''
        });
      });

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      const savedSchedule = vi.mocked(storage.set).mock
        .calls[0][1] as AppSettings;
      expect(savedSchedule.schedules[1].endTime).toBe('24:00');
    });
  });

  describe('handleDeleteSchedule', () => {
    beforeEach(() => {
      vi.mocked(storage.set).mockResolvedValue(undefined);
    });

    it('settingsがundefinedの場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: undefined, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleDeleteSchedule('schedule-1');
      });

      expect(storage.set).not.toHaveBeenCalled();
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

      expect(storage.set).toHaveBeenCalledWith('settings', expectedSettings);
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

      expect(storage.set).toHaveBeenCalledWith('settings', expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
    });
  });

  describe('handleToggleSchedule', () => {
    beforeEach(() => {
      vi.mocked(storage.set).mockResolvedValue(undefined);
    });

    it('settingsがundefinedの場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useSchedules({ settings: undefined, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleToggleSchedule('schedule-1', false);
      });

      expect(storage.set).not.toHaveBeenCalled();
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

      expect(storage.set).toHaveBeenCalledWith('settings', expectedSettings);
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
        vi.mocked(storage.get).mockResolvedValue(resumedSettings);
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
        expect(storage.set).toHaveBeenCalledWith('settings', {
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

        expect(storage.set).toHaveBeenCalledWith('settings', {
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

      expect(storage.set).toHaveBeenCalledWith('settings', expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
    });
  });
});
