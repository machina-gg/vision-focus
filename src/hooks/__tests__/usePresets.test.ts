import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePresets } from '~/hooks/usePresets';
import { getMessage } from '~/lib/i18n';
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
import { MAX_PRESETS } from '~/constants/limits';

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  visionItem: {
    setValue: vi.fn()
  },
  settingsItem: {
    setValue: vi.fn()
  }
}));

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/constants/fonts', () => ({
  loadGoogleFont: vi.fn()
}));

vi.mock('~/constants/intervals', () => ({
  STATUS_RESET_DELAY_MS: 1000
}));

import { trackFeatureUse } from '~/lib/analytics';
import { sendMessage } from '~/lib/messaging';
import { settingsItem, visionItem } from '~/lib/storage';

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'schedule-1',
  name: 'Weekday Focus',
  startTime: '09:00',
  endTime: '12:00',
  days: [1, 2, 3, 4, 5],
  enabled: true,
  ...overrides
});

const settingsWith = (schedules: Schedule[] = []): AppSettings => ({
  ...DEFAULT_SETTINGS,
  schedules
});

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

const mockVision: VisionSettings = {
  ...DEFAULT_VISION,
  presets: [mockPreset],
  activePresetId: 'preset-1'
};

const twoPresetsVision: VisionSettings = {
  ...mockVision,
  presets: [mockPreset, anotherPreset]
};

interface HookProps {
  vision: VisionSettings | undefined;
  settings: AppSettings | undefined;
}

function renderUsePresets(
  vision: VisionSettings | undefined,
  settings: AppSettings | undefined = settingsWith()
) {
  return renderHook((props: HookProps) => usePresets(props), {
    initialProps: { vision, settings }
  });
}

function expectNoStorageWrite() {
  expect(visionItem.setValue).not.toHaveBeenCalled();
  expect(settingsItem.setValue).not.toHaveBeenCalled();
}

describe('usePresets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
  });

  describe('初期化', () => {
    it('適用中のスタイルを選び、その表示設定を下書きにする', () => {
      const { result } = renderUsePresets(mockVision);

      expect(result.current.selectedPresetId).toBe('preset-1');
      expect(result.current.editingPresetName).toBe('Focus Mode');
      expect(result.current.draftDisplaySettings.goalText).toBe('Stay Focused');
      expect(result.current.isDirty).toBe(false);
    });

    it('適用中のスタイルが無ければ最初のスタイルを選ぶ', () => {
      const { result } = renderUsePresets({
        ...twoPresetsVision,
        activePresetId: null
      });

      expect(result.current.selectedPresetId).toBe('preset-1');
    });

    it('スタイルが無ければ何も選ばず、既定の表示設定を出す', () => {
      const { result } = renderUsePresets({ ...DEFAULT_VISION, presets: [] });

      expect(result.current.selectedPresetId).toBeNull();
      expect(result.current.editingPresetName).toBe('');
      expect(result.current.draftDisplaySettings).toEqual(
        DEFAULT_DISPLAY_SETTINGS
      );
    });

    it('読み込み前は何も選ばず、読み込まれたら適用中のスタイルを選ぶ', () => {
      const { result, rerender } = renderUsePresets(undefined);

      expect(result.current.selectedPresetId).toBeNull();
      expect(result.current.draftPresets).toEqual([]);

      rerender({ vision: mockVision, settings: settingsWith() });

      expect(result.current.selectedPresetId).toBe('preset-1');
    });

    it('読み込み前の fallback（スタイル 0 件）の後に保存値が届いたら、適用中のスタイルを選ぶ', () => {
      const { result, rerender } = renderUsePresets(DEFAULT_VISION);

      expect(result.current.selectedPresetId).toBeNull();

      rerender({ vision: mockVision, settings: settingsWith() });

      expect(result.current.selectedPresetId).toBe('preset-1');
      expect(result.current.draftDisplaySettings.goalText).toBe('Stay Focused');
    });

    it('初期化の後に適用中のスタイルが変わっても、選択は変わらない', async () => {
      const { result, rerender } = renderUsePresets({
        ...twoPresetsVision,
        activePresetId: 'preset-1'
      });

      await waitFor(() => {
        expect(result.current.selectedPresetId).toBe('preset-1');
      });

      rerender({
        vision: { ...twoPresetsVision, activePresetId: 'preset-2' },
        settings: settingsWith()
      });

      expect(result.current.selectedPresetId).toBe('preset-1');
    });
  });

  describe('保存値への追従', () => {
    it('別の画面で増えたスタイルが一覧に出る', () => {
      const { result, rerender } = renderUsePresets(mockVision);

      rerender({ vision: twoPresetsVision, settings: settingsWith() });

      expect(result.current.draftPresets.map((p) => p.id)).toEqual([
        'preset-1',
        'preset-2'
      ]);
    });

    it('保存値が変わっても、選択中のスタイルの保存していない変更は保つ', () => {
      const { result, rerender } = renderUsePresets(mockVision);

      act(() => {
        result.current.handleGoalTextChange('Draft Goal');
        result.current.handlePresetNameChange('Draft Name');
      });

      rerender({
        vision: {
          ...twoPresetsVision,
          presets: [
            { ...mockPreset, goalText: 'Changed Elsewhere' },
            anotherPreset
          ]
        },
        settings: settingsWith()
      });

      expect(result.current.draftPresets).toHaveLength(2);
      expect(result.current.draftDisplaySettings.goalText).toBe('Draft Goal');
      expect(result.current.editingPresetName).toBe('Draft Name');
      expect(result.current.isDirty).toBe(true);
    });

    it('変更していなければ、選択中のスタイルの保存値の変更を出す', () => {
      const { result, rerender } = renderUsePresets(mockVision);

      rerender({
        vision: {
          ...mockVision,
          presets: [{ ...mockPreset, name: 'Renamed', goalText: 'New Goal' }]
        },
        settings: settingsWith()
      });

      expect(result.current.editingPresetName).toBe('Renamed');
      expect(result.current.draftDisplaySettings.goalText).toBe('New Goal');
    });

    it('選択中のスタイルが別の画面で消えたら、選択を外す', () => {
      const { result, rerender } = renderUsePresets(twoPresetsVision);

      rerender({
        vision: { ...twoPresetsVision, presets: [anotherPreset] },
        settings: settingsWith()
      });

      expect(result.current.selectedPresetId).toBeNull();
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('下書きの編集', () => {
    it.each([
      [
        'handleGoalTextChange',
        (r: ReturnType<typeof usePresets>) => r.handleGoalTextChange('G'),
        { goalText: 'G' }
      ],
      [
        'handleGoalSubTextChange',
        (r: ReturnType<typeof usePresets>) => r.handleGoalSubTextChange('S'),
        { goalSubText: 'S' }
      ],
      [
        'handleTextColorChange',
        (r: ReturnType<typeof usePresets>) =>
          r.handleTextColorChange('#ff0000'),
        { textColor: '#ff0000' }
      ],
      [
        'handleBackgroundTypeChange',
        (r: ReturnType<typeof usePresets>) =>
          r.handleBackgroundTypeChange('color'),
        { backgroundType: 'color' }
      ],
      [
        'handleBackgroundChange',
        (r: ReturnType<typeof usePresets>) =>
          r.handleBackgroundChange('default-2'),
        { backgroundImage: 'default-2' }
      ],
      [
        'handleBackgroundColorChange',
        (r: ReturnType<typeof usePresets>) =>
          r.handleBackgroundColorChange('#00ff00'),
        { backgroundColor: '#00ff00' }
      ],
      [
        'handleCustomBackgroundChange',
        (r: ReturnType<typeof usePresets>) =>
          r.handleCustomBackgroundChange('data:image/jpeg;base64,AAAA'),
        { customBackgroundData: 'data:image/jpeg;base64,AAAA' }
      ],
      [
        'handleFontSettingsChange',
        (r: ReturnType<typeof usePresets>) =>
          r.handleFontSettingsChange({
            ...DEFAULT_FONT_SETTINGS,
            family: 'inter'
          }),
        { fontSettings: { ...DEFAULT_FONT_SETTINGS, family: 'inter' } }
      ]
    ])(
      '%s で下書きだけが変わり、保存領域には書かない',
      (_name, edit, expected) => {
        const { result } = renderUsePresets(mockVision);

        act(() => {
          edit(result.current);
        });

        expect(result.current.draftDisplaySettings).toMatchObject(expected);
        expect(result.current.isDirty).toBe(true);
        expect(sendMessage).not.toHaveBeenCalled();
        expectNoStorageWrite();
      }
    );

    it('続けて編集しても、先の変更が残る', () => {
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.handleGoalTextChange('Goal');
        result.current.handleTextColorChange('#123456');
        result.current.handlePresetNameChange('Name');
      });

      expect(result.current.draftDisplaySettings.goalText).toBe('Goal');
      expect(result.current.draftDisplaySettings.textColor).toBe('#123456');
      expect(result.current.editingPresetName).toBe('Name');
    });
  });

  describe('handleSelectPreset', () => {
    it('選んだスタイルの表示設定に切り替え、保存していない変更は捨てる', () => {
      const { result } = renderUsePresets(twoPresetsVision);

      act(() => {
        result.current.handleGoalTextChange('Draft');
      });
      act(() => {
        result.current.handleSelectPreset('preset-2');
      });

      expect(result.current.selectedPresetId).toBe('preset-2');
      expect(result.current.editingPresetName).toBe('Relax Mode');
      expect(result.current.draftDisplaySettings.goalText).toBe('Take a Break');
      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.handleSelectPreset('preset-1');
      });

      expect(result.current.draftDisplaySettings.goalText).toBe('Stay Focused');
    });

    it('存在しないスタイルなら何もしない', () => {
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.handleSelectPreset('non-existent-id');
      });

      expect(result.current.selectedPresetId).toBe('preset-1');
    });
  });

  describe('handleSaveSelectedPreset', () => {
    it('update-preset に名前と下書きの表示設定を trim せずに送り、保存領域には書かない', async () => {
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.handleGoalTextChange(' Updated Goal ');
        result.current.handlePresetNameChange(' Updated Name ');
      });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledWith('update-preset', {
        id: 'preset-1',
        name: ' Updated Name ',
        display: {
          goalText: ' Updated Goal ',
          goalSubText: 'Deep Work',
          textColor: '#ffffff',
          backgroundType: 'image',
          backgroundImage: 'default-1',
          backgroundColor: '#1a1a2e',
          customBackgroundData: null,
          fontSettings: DEFAULT_FONT_SETTINGS
        }
      });
      expectNoStorageWrite();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.presetError).toBeNull();
    });

    it('保存が届いたら、保存値を出す', async () => {
      const { result, rerender } = renderUsePresets(mockVision);

      act(() => {
        result.current.handleGoalTextChange(' Updated ');
      });
      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      rerender({
        vision: {
          ...mockVision,
          presets: [{ ...mockPreset, goalText: 'Updated' }]
        },
        settings: settingsWith()
      });

      expect(result.current.draftDisplaySettings.goalText).toBe('Updated');
      expect(result.current.isDirty).toBe(false);
    });

    it.each([
      [
        'preset-not-found',
        { code: 'preset-not-found' as const },
        'errorOperationFailed'
      ],
      [
        'invalid-request',
        { code: 'invalid-request' as const },
        'errorOperationFailed'
      ],
      ['save-failed', { code: 'save-failed' as const }, 'errorSaveFailed']
    ])(
      '拒まれたら（%s）文言を出し、下書きを保つ',
      async (_name, error, key) => {
        vi.mocked(sendMessage).mockResolvedValue({ success: false, error });
        const { result } = renderUsePresets(mockVision);

        act(() => {
          result.current.handleGoalTextChange('Draft');
        });
        await act(async () => {
          await result.current.handleSaveSelectedPreset();
        });

        expect(result.current.presetError).toBe(getMessage(key));
        expect(result.current.isDirty).toBe(true);
        expect(result.current.draftDisplaySettings.goalText).toBe('Draft');
        expect(result.current.visionSaved).toBe(false);
      }
    );

    it('送れなかったら汎用の文言を出す', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.handleGoalTextChange('Draft');
      });
      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(result.current.presetError).toBe(
        getMessage('errorOperationFailed')
      );
    });

    it('失敗の文言は次の編集で消える', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'save-failed' }
      });
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.handleGoalTextChange('Draft');
      });
      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });
      expect(result.current.presetError).not.toBeNull();

      act(() => {
        result.current.handleGoalTextChange('Draft 2');
      });

      expect(result.current.presetError).toBeNull();
    });

    it('スタイルを選んでいなければ何も送らない', async () => {
      const { result } = renderUsePresets({ ...DEFAULT_VISION, presets: [] });

      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it.each([
      [
        '目標文',
        (r: ReturnType<typeof usePresets>) => r.handleGoalTextChange('   ')
      ],
      [
        '名前',
        (r: ReturnType<typeof usePresets>) => r.handlePresetNameChange('   ')
      ]
    ])('%sが空白だけなら何も送らない', async (_name, edit) => {
      const { result } = renderUsePresets(mockVision);

      act(() => {
        edit(result.current);
      });
      await act(async () => {
        await result.current.handleSaveSelectedPreset();
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('保存できたら visionSaved が一時的に true になる', async () => {
      vi.useFakeTimers();
      try {
        const { result } = renderUsePresets(mockVision);

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

        expect(result.current.visionSaved).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // アンマウント後にタイマーが残ると、片付け済みの環境へ dispatch してテスト実行後に `window is not defined` が出る
  describe('保存後フィードバックのタイマー', () => {
    const SAVED_FEEDBACK_MS = 1000;

    const renderAndSave = async () => {
      const rendered = renderUsePresets(mockVision);

      act(() => {
        rendered.result.current.handleGoalTextChange('Updated Goal');
      });
      await act(async () => {
        await rendered.result.current.handleSaveSelectedPreset();
      });

      return rendered;
    };

    it('アンマウントするとタイマーが止まり、進めても状態が変わらない', async () => {
      vi.useFakeTimers();
      try {
        const { result, unmount } = await renderAndSave();
        expect(result.current.visionSaved).toBe(true);
        expect(vi.getTimerCount()).toBe(1);

        unmount();

        expect(vi.getTimerCount()).toBe(0);
        act(() => {
          vi.advanceTimersByTime(SAVED_FEEDBACK_MS);
        });
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('続けて保存しても、残るタイマーは最後の 1 本だけ', async () => {
      vi.useFakeTimers();
      try {
        const { result } = await renderAndSave();
        expect(vi.getTimerCount()).toBe(1);

        act(() => {
          result.current.handleGoalTextChange('Again');
        });
        await act(async () => {
          await result.current.handleSaveSelectedPreset();
        });

        expect(vi.getTimerCount()).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('handleApplyPreset', () => {
    it('apply-preset に選択中のスタイルを送り、保存領域には書かない', async () => {
      const { result } = renderUsePresets(twoPresetsVision);

      act(() => {
        result.current.handleSelectPreset('preset-2');
      });
      await act(async () => {
        await result.current.handleApplyPreset();
      });

      expect(sendMessage).toHaveBeenCalledWith('apply-preset', {
        id: 'preset-2'
      });
      expectNoStorageWrite();
      expect(trackFeatureUse).toHaveBeenCalledWith('preset_switch');
      expect(result.current.visionSaved).toBe(true);
    });

    it('拒まれたら文言を出し、利用の記録は送らない', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'preset-not-found' }
      });
      const { result } = renderUsePresets(mockVision);

      await act(async () => {
        await result.current.handleApplyPreset();
      });

      expect(result.current.presetError).toBe(
        getMessage('errorOperationFailed')
      );
      expect(trackFeatureUse).not.toHaveBeenCalled();
    });

    it('スタイルを選んでいなければ何も送らない', async () => {
      const { result } = renderUsePresets(undefined);

      await act(async () => {
        await result.current.handleApplyPreset();
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleCreatePreset', () => {
    it('create-preset に名前を trim せずに送り、返った ID のスタイルが届いたら選ぶ', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: true,
        id: 'new-preset-id'
      });
      const { result, rerender } = renderUsePresets(mockVision);

      act(() => {
        result.current.setShowSavePresetModal(true);
        result.current.setPresetName(' New Preset ');
      });
      await act(async () => {
        await result.current.handleCreatePreset();
      });

      expect(sendMessage).toHaveBeenCalledWith('create-preset', {
        name: ' New Preset '
      });
      expectNoStorageWrite();
      expect(trackFeatureUse).toHaveBeenCalledWith('preset_create');
      expect(result.current.showSavePresetModal).toBe(false);
      expect(result.current.presetName).toBe('');

      const created: DashboardPreset = {
        ...DEFAULT_DISPLAY_SETTINGS,
        id: 'new-preset-id',
        name: 'New Preset',
        createdAt: '2024-01-03T00:00:00Z'
      };
      rerender({
        vision: { ...mockVision, presets: [mockPreset, created] },
        settings: settingsWith()
      });

      expect(result.current.selectedPresetId).toBe('new-preset-id');
      expect(result.current.editingPresetName).toBe('New Preset');
    });

    it('上限で拒まれたらモーダルを開いたまま上限の文言を出す', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'preset-limit' }
      });
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.setShowSavePresetModal(true);
        result.current.setPresetName('Eleventh');
      });
      await act(async () => {
        await result.current.handleCreatePreset();
      });

      expect(result.current.createPresetError).toBe(
        getMessage('maxPresetsReached', String(MAX_PRESETS))
      );
      expect(result.current.showSavePresetModal).toBe(true);
      expect(result.current.presetName).toBe('Eleventh');
      expect(result.current.selectedPresetId).toBe('preset-1');
      expect(trackFeatureUse).not.toHaveBeenCalled();
    });

    it('作成の失敗の文言は、名前を変えるかモーダルを閉じると消える', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'preset-limit' }
      });
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.setPresetName('Eleventh');
      });
      await act(async () => {
        await result.current.handleCreatePreset();
      });
      act(() => {
        result.current.setPresetName('Eleventh!');
      });
      expect(result.current.createPresetError).toBeNull();

      await act(async () => {
        await result.current.handleCreatePreset();
      });
      act(() => {
        result.current.setShowSavePresetModal(false);
      });
      expect(result.current.createPresetError).toBeNull();
    });

    it('名前が空白だけなら何も送らない', async () => {
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.setPresetName('   ');
      });
      await act(async () => {
        await result.current.handleCreatePreset();
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('削除（参照しているスケジュールが無い場合）', () => {
    it('確認を出さずに delete-preset を送り、保存領域には書かない', async () => {
      const settings = settingsWith([makeSchedule({ presetId: 'preset-2' })]);
      const { result } = renderUsePresets(twoPresetsVision, settings);

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      expect(result.current.deleteTargetPresetId).toBeNull();
      expect(sendMessage).toHaveBeenCalledWith('delete-preset', {
        id: 'preset-1'
      });
      expectNoStorageWrite();
    });

    it('選択中のスタイルを消したら選択を外し、既定の表示設定を出す', async () => {
      const { result } = renderUsePresets(mockVision);

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      expect(result.current.selectedPresetId).toBeNull();
      expect(result.current.draftDisplaySettings).toEqual(
        mockVision.defaultSettings
      );
    });

    it('選択していないスタイルを消しても、選択と下書きは変わらない', async () => {
      const { result } = renderUsePresets(twoPresetsVision);

      act(() => {
        result.current.handleGoalTextChange('Draft');
      });
      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-2');
      });

      expect(result.current.selectedPresetId).toBe('preset-1');
      expect(result.current.draftDisplaySettings.goalText).toBe('Draft');
    });

    it('拒まれたら文言を出し、選択は変えない', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'save-failed' }
      });
      const { result } = renderUsePresets(mockVision);

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      expect(result.current.presetError).toBe(getMessage('errorSaveFailed'));
      expect(result.current.selectedPresetId).toBe('preset-1');
    });

    it('settings が未取得なら確認を出さずに delete-preset を送る', async () => {
      const { result } = renderUsePresets(mockVision, undefined);

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      expect(result.current.deleteTargetPresetId).toBeNull();
      expect(sendMessage).toHaveBeenCalledWith('delete-preset', {
        id: 'preset-1'
      });
    });
  });

  describe('スケジュールが参照しているスタイルの削除', () => {
    const linkedSettings = settingsWith([
      makeSchedule({ id: 'schedule-1', presetId: 'preset-1' }),
      makeSchedule({ id: 'schedule-2', presetId: 'preset-1', enabled: false }),
      makeSchedule({ id: 'schedule-3', presetId: 'other-preset' })
    ]);

    it('参照が 1 件以上あるときは確認待ちになり、件数を返す（まだ送らない）', async () => {
      const { result } = renderUsePresets(mockVision, linkedSettings);

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });

      expect(result.current.deleteTargetPresetId).toBe('preset-1');
      expect(result.current.deleteTargetScheduleCount).toBe(2);
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('確認すると delete-preset を 1 通だけ送り、スケジュールは画面から書かない', async () => {
      const { result } = renderUsePresets(mockVision, linkedSettings);

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });
      await act(async () => {
        await result.current.handleConfirmDeletePreset();
      });

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledWith('delete-preset', {
        id: 'preset-1'
      });
      expectNoStorageWrite();
      expect(result.current.deleteTargetPresetId).toBeNull();
    });

    it('確認して拒まれたら確認を閉じ、文言を出す', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'preset-not-found' }
      });
      const { result } = renderUsePresets(mockVision, linkedSettings);

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });
      await act(async () => {
        await result.current.handleConfirmDeletePreset();
      });

      expect(result.current.deleteTargetPresetId).toBeNull();
      expect(result.current.presetError).toBe(
        getMessage('errorOperationFailed')
      );
    });

    it('キャンセルすると何も送らない', async () => {
      const { result } = renderUsePresets(mockVision, linkedSettings);

      await act(async () => {
        await result.current.handleRequestDeletePreset('preset-1');
      });
      act(() => {
        result.current.handleCancelDeletePreset();
      });

      expect(result.current.deleteTargetPresetId).toBeNull();
      expect(result.current.draftPresets).toHaveLength(1);
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('確認待ちでないときに確認しても何も送らない', async () => {
      const { result } = renderUsePresets(mockVision, linkedSettings);

      await act(async () => {
        await result.current.handleConfirmDeletePreset();
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('モーダル管理', () => {
    it('setShowSavePresetModal でモーダルの表示状態を切り替え', () => {
      const { result } = renderUsePresets(mockVision);

      expect(result.current.showSavePresetModal).toBe(false);

      act(() => {
        result.current.setShowSavePresetModal(true);
      });

      expect(result.current.showSavePresetModal).toBe(true);
    });

    it('setPresetName でプリセット名を設定', () => {
      const { result } = renderUsePresets(mockVision);

      act(() => {
        result.current.setPresetName('Test Name');
      });

      expect(result.current.presetName).toBe('Test Name');
    });
  });
});
