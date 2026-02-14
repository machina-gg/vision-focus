import { describe, expect, it } from 'vitest';

import { presetToDisplaySettings } from '~/lib/presetUtils';
import type { DashboardPreset } from '~/types/storage';

// テスト用プリセット
const mockPreset: DashboardPreset = {
  id: 'p1',
  name: 'Test Preset',
  createdAt: '2024-01-01T00:00:00Z',
  goalText: 'My Goal',
  goalSubText: 'Sub Goal',
  textColor: '#ffffff',
  backgroundType: 'image',
  backgroundImage: 'default-1',
  backgroundColor: '#1a1a2e',
  customBackgroundData: 'data:image/png;base64,custom',
  fontSettings: {
    family: 'inter',
    size: 'md',
    weight: 'normal'
  }
};

describe('presetToDisplaySettings', () => {
  it('プリセットからディスプレイ設定を正しく抽出する', () => {
    const result = presetToDisplaySettings(mockPreset);
    expect(result.goalText).toBe('My Goal');
    expect(result.goalSubText).toBe('Sub Goal');
    expect(result.textColor).toBe('#ffffff');
    expect(result.backgroundType).toBe('image');
    expect(result.backgroundImage).toBe('default-1');
    expect(result.backgroundColor).toBe('#1a1a2e');
    expect(result.fontSettings).toEqual(mockPreset.fontSettings);
  });

  it('プレミアムユーザーはカスタム背景を保持する', () => {
    const result = presetToDisplaySettings(mockPreset, true);
    expect(result.customBackgroundData).toBe('data:image/png;base64,custom');
  });

  it('非プレミアムユーザーはカスタム背景がnullになる', () => {
    const result = presetToDisplaySettings(mockPreset, false);
    expect(result.customBackgroundData).toBeNull();
  });

  it('デフォルト引数（isPremium=true）', () => {
    const result = presetToDisplaySettings(mockPreset);
    expect(result.customBackgroundData).toBe('data:image/png;base64,custom');
  });

  it('id/name/createdAtはディスプレイ設定に含まない', () => {
    const result = presetToDisplaySettings(mockPreset);
    expect('id' in result).toBe(false);
    expect('name' in result).toBe(false);
    expect('createdAt' in result).toBe(false);
  });
});
