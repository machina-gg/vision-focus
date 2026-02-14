import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useResolvedPreset } from '~/hooks/useResolvedPreset';
import type { VisionSettings, AppSettings } from '~/types/storage';
import {
  DEFAULT_VISION,
  DEFAULT_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS
} from '~/types/storage';

// presetUtils モジュールをモック
vi.mock('~/lib/presetUtils', () => ({
  presetToDisplaySettings: vi.fn((preset, isPremium) => ({
    goalText: preset.goalText,
    goalSubText: preset.goalSubText,
    textColor: preset.textColor,
    backgroundType: preset.backgroundType,
    backgroundImage: preset.backgroundImage,
    backgroundColor: preset.backgroundColor,
    customBackgroundData: isPremium ? preset.customBackgroundData : null,
    fontSettings: preset.fontSettings
  }))
}));

// time モジュールをモック
vi.mock('~/lib/time', () => ({
  isWithinSchedule: vi.fn(() => false)
}));

import { isWithinSchedule } from '~/lib/time';

const mockIsWithinSchedule = vi.mocked(isWithinSchedule);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsWithinSchedule.mockReturnValue(false);
});

// テスト用のプリセット付きビジョン設定
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
      customBackgroundData: null,
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
          settings: undefined,
          isPremium: false
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
          settings: DEFAULT_SETTINGS,
          isPremium: true
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
          settings: DEFAULT_SETTINGS,
          isPremium: true
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
            customBackgroundData: null,
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
        useResolvedPreset({ vision, settings, isPremium: true })
      );
      expect(result.current.displaySettings.goalText).toBe('Schedule Goal');
    });
  });

  describe('非プレミアムの制限', () => {
    it('非プレミアムでもフリーティアの範囲内のプリセットは使える', () => {
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision: presetVision,
          settings: DEFAULT_SETTINGS,
          isPremium: false
        })
      );
      // 最初のプリセットはフリーティアで使える
      expect(result.current.displaySettings.goalText).toBe('Focus on work');
    });

    it('非プレミアムではカスタム背景がnullになる', () => {
      const vision: VisionSettings = {
        ...DEFAULT_VISION,
        defaultSettings: {
          ...DEFAULT_DISPLAY_SETTINGS,
          customBackgroundData: 'data:image/png;base64,custom'
        }
      };
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision,
          settings: DEFAULT_SETTINGS,
          isPremium: false
        })
      );
      expect(result.current.displaySettings.customBackgroundData).toBeNull();
    });

    it('プレミアムではカスタム背景を保持する', () => {
      const vision: VisionSettings = {
        ...DEFAULT_VISION,
        defaultSettings: {
          ...DEFAULT_DISPLAY_SETTINGS,
          customBackgroundData: 'data:image/png;base64,custom'
        }
      };
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision,
          settings: DEFAULT_SETTINGS,
          isPremium: true
        })
      );
      expect(result.current.displaySettings.customBackgroundData).toBe(
        'data:image/png;base64,custom'
      );
    });
  });

  describe('timeTick', () => {
    it('初期値が0', () => {
      const { result } = renderHook(() =>
        useResolvedPreset({
          vision: DEFAULT_VISION,
          settings: DEFAULT_SETTINGS,
          isPremium: false
        })
      );
      expect(result.current.timeTick).toBe(0);
    });
  });
});
