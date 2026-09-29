import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useResolvedPreset } from '~/hooks/useResolvedPreset';
import type { VisionSettings, AppSettings } from '~/types/storage';
import {
  DEFAULT_VISION,
  DEFAULT_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS
} from '~/types/storage';

vi.mock('~/lib/presetUtils', () => ({
  presetToDisplaySettings: vi.fn((preset) => ({
    goalText: preset.goalText,
    goalSubText: preset.goalSubText,
    textColor: preset.textColor,
    backgroundType: preset.backgroundType,
    backgroundImage: preset.backgroundImage,
    backgroundColor: preset.backgroundColor,
    fontSettings: preset.fontSettings
  }))
}));

vi.mock('~/lib/time', () => ({
  isWithinSchedule: vi.fn(() => false)
}));

import { isWithinSchedule } from '~/lib/time';

const mockIsWithinSchedule = vi.mocked(isWithinSchedule);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsWithinSchedule.mockReturnValue(false);
});

const presetVision: VisionSettings = {
  ...DEFAULT_VISION,
  presets: [
    {
      id: 'preset-1',
      name: 'Work',
      createdAt: '2024-01-01T00:00:00Z',
      goalText: 'Focus on work',
      goalSubText: 'Stay productive',
      textColor: '#ff0000',
      backgroundType: 'color',
      backgroundImage: '',
      backgroundColor: '#000000',
      customBackgroundId: 'img-1',
      fontSettings: { family: 'inter', size: 'lg', weight: 'bold' }
    }
  ],
  activePresetId: 'preset-1'
};

describe('useResolvedPreset', () => {
  describe('visionがundefinedの場合', () => {
    it('デフォルトのディスプレイ設定を返す', () => {
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision: undefined,
          settings: undefined
        })
      );
      expect(result.current.displaySettings).toEqual(DEFAULT_DISPLAY_SETTINGS);
    });
  });

  describe('アクティブプリセットの解決', () => {
    it('activePresetIdが設定されている場合、プリセットの設定を返す', () => {
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision: presetVision,
          settings: DEFAULT_SETTINGS
        })
      );
      expect(result.current.displaySettings.goalText).toBe('Focus on work');
    });

    it('activePresetIdが存在しないIDの場合、デフォルト設定を返す', () => {
      const vision: VisionSettings = {
        ...DEFAULT_VISION,
        activePresetId: 'nonexistent'
      };
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision,
          settings: DEFAULT_SETTINGS
        })
      );
      expect(result.current.displaySettings).toEqual(DEFAULT_DISPLAY_SETTINGS);
    });
  });

  describe('スケジュールプリセットの優先', () => {
    it('アクティブなスケジュールのプリセットが最優先される', () => {
      mockIsWithinSchedule.mockReturnValue(true);
      const vision: VisionSettings = {
        ...DEFAULT_VISION,
        presets: [
          {
            id: 'schedule-preset',
            name: 'Schedule',
            createdAt: '2024-01-01T00:00:00Z',
            goalText: 'Schedule Goal',
            goalSubText: '',
            textColor: '#fff',
            backgroundType: 'color',
            backgroundImage: '',
            backgroundColor: '#111',
            customBackgroundId: null,
            fontSettings: { family: 'inter', size: 'md', weight: 'normal' }
          }
        ],
        activePresetId: null
      };
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        schedules: [
          {
            id: 's1',
            name: 'Work',
            startTime: '09:00',
            endTime: '17:00',
            days: [1, 2, 3, 4, 5],
            enabled: true,
            presetId: 'schedule-preset'
          }
        ]
      };
      const { result } = renderHook(() =>
        useResolvedPreset({ vision, settings })
      );
      expect(result.current.displaySettings.goalText).toBe('Schedule Goal');
    });
  });

  describe('画像の ID', () => {
    it('表示するスタイルの画像の ID を返す', () => {
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision: presetVision,
          settings: DEFAULT_SETTINGS
        })
      );
      expect(result.current.customBackgroundId).toBe('img-1');
    });

    it('既定の表示設定を使うときは null を返す', () => {
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision: { ...presetVision, activePresetId: null },
          settings: DEFAULT_SETTINGS
        })
      );
      expect(result.current.customBackgroundId).toBeNull();
    });

    it('読み込み前は null を返す', () => {
      const { result } = renderHook(() =>
        useResolvedPreset({ vision: undefined, settings: undefined })
      );
      expect(result.current.customBackgroundId).toBeNull();
    });
  });

  describe('timeTick', () => {
    it('初期値が0', () => {
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision: DEFAULT_VISION,
          settings: DEFAULT_SETTINGS
        })
      );
      expect(result.current.timeTick).toBe(0);
    });
  });
});
