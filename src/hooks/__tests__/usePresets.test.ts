import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePresets } from '~/hooks/usePresets';
import type {
  AppSettings,
  Schedule,
  VisionSettings,
  DashboardPreset
} from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_DISPLAY_SETTINGS
} from '~/types/storage';
import { DEFAULT_FONT_SETTINGS } from '~/types/font';

// Mock dependencies
vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  getVision: vi.fn(),
  visionItem: {
    setValue: vi.fn()
  },
  settingsItem: {
    setValue: vi.fn()
  }
}));

vi.mock('~/lib/presetUtils', () => ({
  presetToDisplaySettings: vi.fn((preset: DashboardPreset) => ({
    goalText: preset.goalText,
    goalSubText: preset.goalSubText,
    textColor: preset.textColor,
    backgroundType: preset.backgroundType,
    backgroundImage: preset.backgroundImage,
    backgroundColor: preset.backgroundColor,
    customBackgroundData: preset.customBackgroundData,
    fontSettings: preset.fontSettings
  }))
}));

vi.mock('~/constants/fonts', () => ({
  loadGoogleFont: vi.fn()
}));

vi.mock('~/constants/intervals', () => ({
  STATUS_RESET_DELAY_MS: 1000
}));

import { trackFeatureUse } from '~/lib/analytics';
import { getVision, settingsItem, visionItem } from '~/lib/storage';

describe('usePresets', () => {
  const mockSetVision = vi.fn();
  const mockSetSettings = vi.fn();

  // スタイルを参照しているスケジュール（#333 の対象）
  const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
    id: 'schedule-1',
    name: 'Weekday Focus',
    startTime: '09:00',
    endTime: '12:00',
    days: [1, 2, 3, 4, 5],
    enabled: true,
    ...overrides
  });

  const makeSettings = (schedules: Schedule[] = []): AppSettings => ({
    ...DEFAULT_SETTINGS,
    schedules
  });

  const renderUsePresets = (
    vision: VisionSettings | undefined,
    settings: AppSettings = makeSettings()
  ) =>
    renderHook(() =>
      usePresets({
        vision,
        setVision: mockSetVision,
        settings,
        setSettings: mockSetSettings
      })
    );

  const mockPreset: DashboardPreset = {
    id: 'preset-1',
    name: 'Focus Mode',
    goalText: 'Stay Focused',
    goalSubText: 'Deep Work',
    textColor: '#ffffff',
    backgroundType: 'image',
    backgroundImage: 'default-1',
    backgroundColor: '#1a1a2e',
    customBackgroundData: null,
    fontSettings: DEFAULT_FONT_SETTINGS,
    createdAt: '2024-01-01T00:00:00Z'
  };

  const mockVision: VisionSettings = {
    ...DEFAULT_VISION,
    presets: [mockPreset],
    activePresetId: 'preset-1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getVision).mockResolvedValue(mockVision);
    vi.mocked(visionItem.setValue).mockResolvedValue(undefined);
    vi.mocked(settingsItem.setValue).mockResolvedValue(undefined);
    // crypto.randomUUID のモック
    vi.stubGlobal('crypto', {
      ...global.crypto,
      randomUUID: vi.fn(() => 'new-preset-id')
    });
  });

  describe('初期化', () => {
    it('プリセットがある場合、activePresetIdを選択', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
        expect(result.current.editingPresetName).toBe('Focus Mode');
        expect(result.current.draftDisplaySettings.goalText).toBe(
          'Stay Focused'
        );
      });
    });

    it('activePresetIdがnullの場合、最初のプリセットを選択', async () => {
      const visionWithoutActive: VisionSettings = {
        ...mockVision,
        activePresetId: null
      };

      vi.mocked(getVision).mockResolvedValue(visionWithoutActive);

      const { result } = renderUsePresets(visionWithoutActive);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });
    });

    it('プリセットがない場合、デフォルト設定を使用', async () => {
      const visionWithoutPresets: VisionSettings = {
        ...DEFAULT_VISION,
        presets: []
      };

      vi.mocked(getVision).mockResolvedValue(visionWithoutPresets);

      const { result } = renderUsePresets(visionWithoutPresets);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBeNull();
        expect(result.current.editingPresetName).toBe('');
        expect(result.current.draftDisplaySettings).toEqual(
          DEFAULT_DISPLAY_SETTINGS
        );
      });
    });

    it('visionが未保存の場合、DEFAULT_VISIONを使用', async () => {
      // 未保存なら項目定義の fallback（DEFAULT_VISION）が返る
      vi.mocked(getVision).mockResolvedValue(DEFAULT_VISION);

      const { result } = renderUsePresets(undefined);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBeNull();
      });
    });
  });

  describe('表示設定の更新', () => {
    it('handleGoalTextChange でゴールテキストを更新', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleGoalTextChange('New Goal');
      });

      expect(result.current.draftDisplaySettings.goalText).toBe('New Goal');
      expect(result.current.isDirty).toBe(true);
    });

    it('handleGoalSubTextChange でサブテキストを更新', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleGoalSubTextChange('New Subtext');
      });

      expect(result.current.draftDisplaySettings.goalSubText).toBe(
        'New Subtext'
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('handleTextColorChange でテキスト色を更新', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleTextColorChange('#ff0000');
      });

      expect(result.current.draftDisplaySettings.textColor).toBe('#ff0000');
      expect(result.current.isDirty).toBe(true);
    });

    it('handleBackgroundTypeChange で背景タイプを更新', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleBackgroundTypeChange('color');
      });

      expect(result.current.draftDisplaySettings.backgroundType).toBe('color');
      expect(result.current.isDirty).toBe(true);
    });

    it('handleBackgroundChange で背景画像を更新', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleBackgroundChange('default-2');
      });

      expect(result.current.draftDisplaySettings.backgroundImage).toBe(
        'default-2'
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('handleBackgroundColorChange で背景色を更新', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleBackgroundColorChange('#00ff00');
      });

      expect(result.current.draftDisplaySettings.backgroundColor).toBe(
        '#00ff00'
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('handleFontSettingsChange でフォント設定を更新', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      const newFontSettings = {
        ...DEFAULT_FONT_SETTINGS,
        family: 'inter' as const
      };

      act(() => {
        result.current.handleFontSettingsChange(newFontSettings);
      });

      expect(result.current.draftDisplaySettings.fontSettings).toEqual(
        newFontSettings
      );
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('handleSelectPreset', () => {
    it('プリセットを選択すると、表示設定を切り替え', async () => {
      const anotherPreset: DashboardPreset = {
        id: 'preset-2',
        name: 'Relax Mode',
        goalText: 'Take a Break',
        goalSubText: 'Rest',
        textColor: '#000000',
        backgroundType: 'color',
        backgroundImage: 'default-2',
        backgroundColor: '#f0f0f0',
        customBackgroundData: null,
        fontSettings: DEFAULT_FONT_SETTINGS,
        createdAt: '2024-01-02T00:00:00Z'
      };

      const visionWithMultiplePresets: VisionSettings = {
        ...mockVision,
        presets: [mockPreset, anotherPreset]
      };

      vi.mocked(getVision).mockResolvedValue(visionWithMultiplePresets);

      const { result } = renderUsePresets(visionWithMultiplePresets);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleSelectPreset('preset-2');
      });

      expect(result.current.selectedPresetId).toBe('preset-2');
      expect(result.current.editingPresetName).toBe('Relax Mode');
      expect(result.current.draftDisplaySettings.goalText).toBe('Take a Break');
      expect(result.current.isDirty).toBe(false);
    });

    it('存在しないプリセットIDの場合、何もしない', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleSelectPreset('non-existent-id');
      });

      expect(result.current.selectedPresetId).toBe('preset-1');
    });
  });

  describe('handleSaveSelectedPreset', () => {
    it('選択中のプリセットを保存', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleGoalTextChange('Updated Goal');
        result.current.handlePresetNameChange('Updated Name');
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      const savedVision = vi.mocked(visionItem.setValue).mock.calls[0][0];
      expect(savedVision.presets[0].name).toBe('Updated Name');
      expect(savedVision.presets[0].goalText).toBe('Updated Goal');
      expect(mockSetVision).toHaveBeenCalledWith(savedVision);
      expect(result.current.isDirty).toBe(false);
    });

    it('selectedPresetIdがnullの場合、何もしない', async () => {
      const visionWithoutPresets: VisionSettings = {
        ...DEFAULT_VISION,
        presets: []
      };

      vi.mocked(getVision).mockResolvedValue(visionWithoutPresets);

      const { result } = renderUsePresets(visionWithoutPresets);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBeNull();
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(visionItem.setValue).not.toHaveBeenCalled();
    });

    it('goalTextが空の場合、何もしない', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleGoalTextChange('   ');
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(visionItem.setValue).not.toHaveBeenCalled();
    });

    it('editingPresetNameが空の場合、何もしない', async () => {
      const { result } = renderUsePresets(mockVision);

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handlePresetNameChange('   ');
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(visionItem.setValue).not.toHaveBeenCalled();
    });

    it('保存後、visionSavedフラグが一時的にtrueになる', async () => {
      vi.useFakeTimers();

      const { result } = renderUsePresets(mockVision);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      act(() => {
        result.current.handleGoalTextChange('Updated Goal');
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(result.current.visionSaved).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await vi.waitFor(() => {
        if (result.current.visionSaved !== false) {
          throw new Error('Not updated');
        }
      });

      vi.useRealTimers();
    });
  });

  // アンマウント後にフィードバックのタイマーが残ると、片付け済みの環境へ
  // dispatch してテスト実行後に `window is not defined` が出る（#480）
  describe('保存後フィードバックのタイマー', () => {
    // 上の vi.mock で STATUS_RESET_DELAY_MS に差し替えている値
    const SAVED_FEEDBACK_MS = 1000;

    // 初期化を待ってから 1 回保存し、フィードバックのタイマーを張らせる
    const renderAndSave = async () => {
      const rendered = renderUsePresets(mockVision);
      const { result } = rendered;

      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      act(() => {
        result.current.handleGoalTextChange('Updated Goal');
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      return rendered;
    };

    it('アンマウントするとタイマーが止まり、進めても状態が変わらない', async () => {
      vi.useFakeTimers();

      const { result, unmount } = await renderAndSave();
      expect(result.current.visionSaved).toBe(true);
      expect(vi.getTimerCount()).toBe(1);

      unmount();

      // クリーンアップで止まるので、進めても発火する対象が残っていない
      expect(vi.getTimerCount()).toBe(0);
      act(() => {
        vi.advanceTimersByTime(SAVED_FEEDBACK_MS);
      });
      expect(vi.getTimerCount()).toBe(0);

      vi.useRealTimers();
    });

    it('続けて保存しても、残るタイマーは最後の 1 本だけ', async () => {
      vi.useFakeTimers();

      const { result } = await renderAndSave();
      expect(vi.getTimerCount()).toBe(1);

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(vi.getTimerCount()).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('handleApplyPreset', () => {
    it('選択中のプリセットをアクティブに設定', async () => {
      const { result } = renderUsePresets(mockVision);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleApplyPreset();
      });

      const savedVision = vi.mocked(visionItem.setValue).mock.calls[0][0];
      expect(savedVision.activePresetId).toBe('preset-1');
      expect(mockSetVision).toHaveBeenCalledWith(savedVision);
      expect(trackFeatureUse).toHaveBeenCalledWith('preset_switch');
    });

    it('selectedPresetIdがnullの場合、何もしない', async () => {
      const visionWithoutPresets: VisionSettings = {
        ...DEFAULT_VISION,
        presets: []
      };

      vi.mocked(getVision).mockResolvedValue(visionWithoutPresets);

      const { result } = renderUsePresets(visionWithoutPresets);

      // 初期化が完了するまで待つ（非同期初期化がある）
      await vi.waitFor(() => {
        if (result.current.draftPresets.length !== 0) {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleApplyPreset();
      });

      expect(visionItem.setValue).not.toHaveBeenCalled();
    });

    it('visionがundefinedの場合、何もしない', async () => {
      const { result } = renderUsePresets(undefined);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.draftPresets.length !== 0) {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleApplyPreset();
      });

      expect(visionItem.setValue).not.toHaveBeenCalled();
    });
  });

  describe('handleCreatePreset', () => {
    it('新しいプリセットを作成', async () => {
      const { result } = renderUsePresets(mockVision);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      act(() => {
        result.current.setShowSavePresetModal(true);
        result.current.setPresetName('New Preset');
      });

      await act(async () => {
        await result.current.handleCreatePreset();
      });

      const savedVision = vi.mocked(visionItem.setValue).mock.calls[0][0];
      expect(savedVision.presets).toHaveLength(2);
      expect(savedVision.presets[1].id).toBe('new-preset-id');
      expect(savedVision.presets[1].name).toBe('New Preset');
      expect(mockSetVision).toHaveBeenCalledWith(savedVision);
      expect(trackFeatureUse).toHaveBeenCalledWith('preset_create');
      expect(result.current.showSavePresetModal).toBe(false);
      expect(result.current.presetName).toBe('');
      expect(result.current.selectedPresetId).toBe('new-preset-id');
    });

    it('プリセット名が空の場合、何もしない', async () => {
      const { result } = renderUsePresets(mockVision);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      act(() => {
        result.current.setPresetName('   ');
      });

      await act(async () => {
        await result.current.handleCreatePreset();
      });

      expect(visionItem.setValue).not.toHaveBeenCalled();
    });
  });

  describe('handleRequestDeletePreset（参照しているスケジュールが無い場合）', () => {
    it('プリセットを削除', async () => {
      const { result } = renderUsePresets(mockVision);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      const savedVision = vi.mocked(visionItem.setValue).mock.calls[0][0];
      expect(savedVision.presets).toHaveLength(0);
      expect(mockSetVision).toHaveBeenCalledWith(savedVision);
      expect(result.current.selectedPresetId).toBeNull();
      expect(result.current.draftDisplaySettings).toEqual(
        DEFAULT_DISPLAY_SETTINGS
      );
    });

    it('選択していないプリセットを削除しても、選択は変わらない', async () => {
      const anotherPreset: DashboardPreset = {
        id: 'preset-2',
        name: 'Relax Mode',
        goalText: 'Take a Break',
        goalSubText: 'Rest',
        textColor: '#000000',
        backgroundType: 'color',
        backgroundImage: 'default-2',
        backgroundColor: '#f0f0f0',
        customBackgroundData: null,
        fontSettings: DEFAULT_FONT_SETTINGS,
        createdAt: '2024-01-02T00:00:00Z'
      };

      const visionWithMultiplePresets: VisionSettings = {
        ...mockVision,
        presets: [mockPreset, anotherPreset]
      };

      vi.mocked(getVision).mockResolvedValue(visionWithMultiplePresets);

      const { result } = renderUsePresets(visionWithMultiplePresets);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-2');
      });

      expect(result.current.selectedPresetId).toBe('preset-1');
    });

    it('activePresetIdを削除した場合、nullにリセット', async () => {
      const { result } = renderUsePresets(mockVision);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      const savedVision = vi.mocked(visionItem.setValue).mock.calls[0][0];
      expect(savedVision.activePresetId).toBeNull();
    });

    it('参照が無ければ確認を出さず、スケジュールも保存し直さない', async () => {
      const settings = makeSettings([makeSchedule({ presetId: 'preset-2' })]);
      const { result } = renderUsePresets(mockVision, settings);

      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      expect(result.current.deleteTargetPresetId).toBeNull();
      expect(settingsItem.setValue).not.toHaveBeenCalled();
      expect(visionItem.setValue).toHaveBeenCalled();
    });
  });

  describe('スケジュールが参照しているスタイルの削除（#333）', () => {
    const renderWithLinkedSchedules = async (
      schedules = [
        makeSchedule({ id: 'schedule-1', presetId: 'preset-1' }),
        makeSchedule({
          id: 'schedule-2',
          presetId: 'preset-1',
          enabled: false
        }),
        makeSchedule({ id: 'schedule-3', presetId: 'other-preset' })
      ]
    ) => {
      const settings = makeSettings(schedules);
      const rendered = renderUsePresets(mockVision, settings);

      await vi.waitFor(() => {
        if (rendered.result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      return { ...rendered, settings };
    };

    it('参照が 1 件以上あるときは確認待ちになり、件数を返す', async () => {
      const { result } = await renderWithLinkedSchedules();

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      expect(result.current.deleteTargetPresetId).toBe('preset-1');
      expect(result.current.deleteTargetScheduleCount).toBe(2);
      // 確認の段階では何も保存しない
      expect(settingsItem.setValue).not.toHaveBeenCalled();
      expect(visionItem.setValue).not.toHaveBeenCalled();
    });

    it('確認すると presetId だけが外れ、enabled は変わらない', async () => {
      const { result } = await renderWithLinkedSchedules();

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      await act(async () => {
        await result.current.handleConfirmDeletePreset();
      });

      const savedSettings = vi.mocked(settingsItem.setValue).mock.calls[0][0];
      // 参照していたスケジュールは残り、スタイル連携だけが外れる
      expect(savedSettings.schedules).toHaveLength(3);
      expect(savedSettings.schedules[0].presetId).toBeUndefined();
      expect(savedSettings.schedules[0].enabled).toBe(true);
      expect(savedSettings.schedules[1].presetId).toBeUndefined();
      expect(savedSettings.schedules[1].enabled).toBe(false);
      // 別のスタイルを参照しているスケジュールは触らない
      expect(savedSettings.schedules[2].presetId).toBe('other-preset');
      expect(mockSetSettings).toHaveBeenCalledWith(savedSettings);

      const savedVision = vi.mocked(visionItem.setValue).mock.calls[0][0];
      expect(savedVision.presets).toHaveLength(0);
      expect(result.current.deleteTargetPresetId).toBeNull();
    });

    it('キャンセルすると削除もスケジュールの更新も起きない', async () => {
      const { result } = await renderWithLinkedSchedules();

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      act(() => {
        result.current.handleCancelDeletePreset();
      });

      expect(result.current.deleteTargetPresetId).toBeNull();
      expect(result.current.draftPresets).toHaveLength(1);
      expect(settingsItem.setValue).not.toHaveBeenCalled();
      expect(visionItem.setValue).not.toHaveBeenCalled();
      expect(mockSetSettings).not.toHaveBeenCalled();
      expect(mockSetVision).not.toHaveBeenCalled();
    });

    it('確認待ちでないときに確認しても何も起きない', async () => {
      const { result } = await renderWithLinkedSchedules();

      await act(async () => {
        await result.current.handleConfirmDeletePreset();
      });

      expect(settingsItem.setValue).not.toHaveBeenCalled();
      expect(visionItem.setValue).not.toHaveBeenCalled();
    });

    it('settings が未取得なら確認を出さずに削除する', async () => {
      const { result } = renderHook(() =>
        usePresets({
          vision: mockVision,
          setVision: mockSetVision,
          settings: undefined,
          setSettings: mockSetSettings
        })
      );

      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      expect(result.current.deleteTargetPresetId).toBeNull();
      expect(settingsItem.setValue).not.toHaveBeenCalled();
      expect(visionItem.setValue).toHaveBeenCalled();
    });
  });

  describe('モーダル管理', () => {
    it('setShowSavePresetModal でモーダルの表示状態を切り替え', async () => {
      const { result } = renderUsePresets(mockVision);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      expect(result.current.showSavePresetModal).toBe(false);

      act(() => {
        result.current.setShowSavePresetModal(true);
      });

      expect(result.current.showSavePresetModal).toBe(true);
    });

    it('setPresetName でプリセット名を設定', async () => {
      const { result } = renderUsePresets(mockVision);

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      expect(result.current.presetName).toBe('');

      act(() => {
        result.current.setPresetName('Test Name');
      });

      expect(result.current.presetName).toBe('Test Name');
    });
  });
});
