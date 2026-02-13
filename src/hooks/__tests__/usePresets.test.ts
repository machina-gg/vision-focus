import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePresets } from '~/hooks/usePresets';
import type {
  VisionSettings,
  DashboardPreset,
  DashboardDisplaySettings
} from '~/types/storage';
import {
  DEFAULT_VISION,
  DEFAULT_DISPLAY_SETTINGS
} from '~/types/storage';
import { DEFAULT_FONT_SETTINGS } from '~/types/font';

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
import { storage } from '~/lib/storage';

describe('usePresets', () => {
  const mockSetVision = vi.fn();

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
    vi.mocked(storage.get).mockResolvedValue(mockVision);
    vi.mocked(storage.set).mockResolvedValue();
    // crypto.randomUUID のモック
    vi.stubGlobal('crypto', {
      ...global.crypto,
      randomUUID: vi.fn(() => 'new-preset-id')
    });
  });

  describe('初期化', () => {
    it('プリセットがある場合、activePresetIdを選択', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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

      vi.mocked(storage.get).mockResolvedValue(visionWithoutActive);

      const { result } = renderHook(() =>
        usePresets({
          vision: visionWithoutActive,
          setVision: mockSetVision
        })
      );

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });
    });

    it('プリセットがない場合、デフォルト設定を使用', async () => {
      const visionWithoutPresets: VisionSettings = {
        ...DEFAULT_VISION,
        presets: []
      };

      vi.mocked(storage.get).mockResolvedValue(visionWithoutPresets);

      const { result } = renderHook(() =>
        usePresets({
          vision: visionWithoutPresets,
          setVision: mockSetVision
        })
      );

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBeNull();
        expect(result.current.editingPresetName).toBe('');
        expect(result.current.draftDisplaySettings).toEqual(
          DEFAULT_DISPLAY_SETTINGS
        );
      });
    });

    it('storageからvisionが取得できない場合、DEFAULT_VISIONを使用', async () => {
      vi.mocked(storage.get).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePresets({ vision: undefined, setVision: mockSetVision })
      );

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBeNull();
      });
    });
  });

  describe('表示設定の更新', () => {
    it('handleGoalTextChange でゴールテキストを更新', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      const newFontSettings = {
        ...DEFAULT_FONT_SETTINGS,
        family: 'Inter' as const
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

      vi.mocked(storage.get).mockResolvedValue(visionWithMultiplePresets);

      const { result } = renderHook(() =>
        usePresets({
          vision: visionWithMultiplePresets,
          setVision: mockSetVision
        })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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

      const savedVision = vi.mocked(storage.set).mock.calls[0][1] as VisionSettings;
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

      vi.mocked(storage.get).mockResolvedValue(visionWithoutPresets);

      const { result } = renderHook(() =>
        usePresets({
          vision: visionWithoutPresets,
          setVision: mockSetVision
        })
      );

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBeNull();
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(storage.set).not.toHaveBeenCalled();
    });

    it('goalTextが空の場合、何もしない', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handleGoalTextChange('   ');
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(storage.set).not.toHaveBeenCalled();
    });

    it('editingPresetNameが空の場合、何もしない', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      act(() => {
        result.current.handlePresetNameChange('   ');
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(storage.set).not.toHaveBeenCalled();
    });

    it('保存後、visionSavedフラグが一時的にtrueになる', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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

  describe('handleApplyPreset', () => {
    it('選択中のプリセットをアクティブに設定', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleApplyPreset();
      });

      const savedVision = vi.mocked(storage.set).mock.calls[0][1] as VisionSettings;
      expect(savedVision.activePresetId).toBe('preset-1');
      expect(mockSetVision).toHaveBeenCalledWith(savedVision);
      expect(trackFeatureUse).toHaveBeenCalledWith('preset_switch');
    });

    it('selectedPresetIdがnullの場合、何もしない', async () => {
      const visionWithoutPresets: VisionSettings = {
        ...DEFAULT_VISION,
        presets: []
      };

      vi.mocked(storage.get).mockResolvedValue(visionWithoutPresets);

      const { result } = renderHook(() =>
        usePresets({
          vision: visionWithoutPresets,
          setVision: mockSetVision
        })
      );

      // 初期化が完了するまで待つ（非同期初期化がある）
      await vi.waitFor(() => {
        if (result.current.draftPresets.length !== 0) {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleApplyPreset();
      });

      expect(storage.set).not.toHaveBeenCalled();
    });

    it('visionがundefinedの場合、何もしない', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: undefined, setVision: mockSetVision })
      );

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.draftPresets.length !== 0) {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleApplyPreset();
      });

      expect(storage.set).not.toHaveBeenCalled();
    });
  });

  describe('handleCreatePreset', () => {
    it('新しいプリセットを作成', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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

      const savedVision = vi.mocked(storage.set).mock.calls[0][1] as VisionSettings;
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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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

      expect(storage.set).not.toHaveBeenCalled();
    });
  });

  describe('handleDeletePreset', () => {
    it('プリセットを削除', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleDeletePreset('preset-1');
      });

      const savedVision = vi.mocked(storage.set).mock.calls[0][1] as VisionSettings;
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

      vi.mocked(storage.get).mockResolvedValue(visionWithMultiplePresets);

      const { result } = renderHook(() =>
        usePresets({
          vision: visionWithMultiplePresets,
          setVision: mockSetVision
        })
      );

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleDeletePreset('preset-2');
      });

      expect(result.current.selectedPresetId).toBe('preset-1');
    });

    it('activePresetIdを削除した場合、nullにリセット', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

      // 初期化が完了するまで待つ
      await vi.waitFor(() => {
        if (result.current.selectedPresetId !== 'preset-1') {
          throw new Error('Not ready');
        }
      });

      await act(async () => {
        await result.current.handleDeletePreset('preset-1');
      });

      const savedVision = vi.mocked(storage.set).mock.calls[0][1] as VisionSettings;
      expect(savedVision.activePresetId).toBeNull();
    });
  });

  describe('モーダル管理', () => {
    it('setShowSavePresetModal でモーダルの表示状態を切り替え', async () => {
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
      const { result } = renderHook(() =>
        usePresets({ vision: mockVision, setVision: mockSetVision })
      );

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
