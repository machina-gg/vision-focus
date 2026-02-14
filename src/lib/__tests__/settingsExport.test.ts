import { describe, expect, it } from 'vitest';

import {
  calculateExportSize,
  hasLargeCustomBackgrounds,
  exportSettings,
  validateImportedData,
  applyImportedSettings,
  createDefaultExportData,
  type ExportedSettings
} from '~/lib/settingsExport';
import type { AppSettings, VisionSettings } from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS
} from '~/types/storage';

// テスト用のエクスポートデータを作成するヘルパー
function createValidExportData(
  overrides: Partial<ExportedSettings['data']> = {}
): ExportedSettings {
  return {
    version: 1,
    exportedAt: '2024-06-12T00:00:00Z',
    data: {
      blockList: [],
      schedules: [],
      presets: [],
      defaultDisplaySettings: DEFAULT_DISPLAY_SETTINGS,
      activePresetId: null,
      language: null,
      notifications: DEFAULT_NOTIFICATION_SETTINGS,
      ...overrides
    }
  };
}

describe('calculateExportSize', () => {
  it('エクスポートデータのバイトサイズを返す', () => {
    const data = createValidExportData();
    const size = calculateExportSize(data);
    expect(size).toBeGreaterThan(0);
  });

  it('データが大きいほどサイズも大きい', () => {
    const small = createValidExportData();
    const large = createValidExportData({
      blockList: Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        domain: `site${i}.com`,
        isWildcard: false,
        createdAt: '2024-01-01T00:00:00Z',
        enabled: true
      }))
    });
    expect(calculateExportSize(large)).toBeGreaterThan(
      calculateExportSize(small)
    );
  });
});

describe('hasLargeCustomBackgrounds', () => {
  it('小さいデータはfalseを返す', () => {
    const data = createValidExportData();
    expect(hasLargeCustomBackgrounds(data)).toBe(false);
  });

  it('大きいデータ（1MB超）はtrueを返す', () => {
    // 1MB超のカスタム背景データを生成
    const largeBackground = 'x'.repeat(1.1 * 1024 * 1024);
    const data = createValidExportData({
      presets: [
        {
          id: 'p1',
          name: 'preset1',
          createdAt: '2024-01-01T00:00:00Z',
          goalText: '',
          goalSubText: '',
          textColor: '#ffffff',
          backgroundType: 'image',
          backgroundImage: 'default-1',
          backgroundColor: '#000000',
          customBackgroundData: largeBackground,
          fontSettings: {
            family: 'inter',
            size: 'md',
            weight: 'normal'
          }
        }
      ]
    });
    expect(hasLargeCustomBackgrounds(data)).toBe(true);
  });
});

describe('exportSettings', () => {
  it('デフォルト設定からエクスポートデータを生成する', () => {
    const settings: AppSettings = DEFAULT_SETTINGS;
    const vision: VisionSettings = DEFAULT_VISION;
    const { data, isLarge } = exportSettings(settings, vision);
    expect(data.version).toBe(1);
    expect(data.exportedAt).toBeTruthy();
    expect(data.data.blockList).toEqual([]);
    expect(data.data.schedules).toEqual([]);
    expect(isLarge).toBe(false);
  });

  it('ブロックリストとスケジュールが含まれる', () => {
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      blockList: [
        {
          id: 'b1',
          domain: 'youtube.com',
          isWildcard: false,
          createdAt: '2024-01-01T00:00:00Z',
          enabled: true
        }
      ],
      schedules: [
        {
          id: 's1',
          name: 'Work',
          startTime: '09:00',
          endTime: '17:00',
          days: [1, 2, 3, 4, 5],
          enabled: true
        }
      ]
    };
    const vision: VisionSettings = DEFAULT_VISION;
    const { data } = exportSettings(settings, vision);
    expect(data.data.blockList).toHaveLength(1);
    expect(data.data.schedules).toHaveLength(1);
  });
});

describe('validateImportedData', () => {
  it('有効なJSONデータをパースして成功を返す', () => {
    const data = createValidExportData();
    const result = validateImportedData(JSON.stringify(data));
    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
  });

  it('ファイルが大きすぎる場合にエラーを返す', () => {
    const largeString = 'x'.repeat(6 * 1024 * 1024);
    const result = validateImportedData(largeString);
    expect(result.success).toBe(false);
    expect(result.error).toBe('importErrorFileTooLarge');
  });

  it('不正なJSONの場合にエラーを返す', () => {
    const result = validateImportedData('not json');
    expect(result.success).toBe(false);
    expect(result.error).toBe('importErrorInvalidJson');
  });

  it('スキーマに合わないJSONの場合にエラーを返す', () => {
    const result = validateImportedData(JSON.stringify({ foo: 'bar' }));
    expect(result.success).toBe(false);
    expect(result.error).toBe('importErrorInvalidFormat');
  });

  it('新しいバージョンの場合に警告を含む', () => {
    const data = createValidExportData();
    data.version = 999;
    const result = validateImportedData(JSON.stringify(data));
    expect(result.success).toBe(true);
    expect(result.warnings).toContain('importWarningNewerVersion');
  });

  it('スケジュールの孤立プリセット参照がある場合に警告', () => {
    const data = createValidExportData({
      schedules: [
        {
          id: 's1',
          name: 'Schedule',
          startTime: '09:00',
          endTime: '17:00',
          days: [1],
          enabled: true,
          presetId: 'nonexistent-preset'
        }
      ]
    });
    const result = validateImportedData(JSON.stringify(data));
    expect(result.success).toBe(true);
    expect(result.warnings).toContain('importWarningOrphanedPresets');
  });

  it('activePresetIdが存在しないプリセットの場合に警告', () => {
    const data = createValidExportData({
      activePresetId: 'nonexistent'
    });
    const result = validateImportedData(JSON.stringify(data));
    expect(result.success).toBe(true);
    expect(result.warnings).toContain('importWarningActivePresetNotFound');
  });

  it('警告がない場合はundefined', () => {
    const data = createValidExportData();
    const result = validateImportedData(JSON.stringify(data));
    expect(result.warnings).toBeUndefined();
  });
});

describe('applyImportedSettings', () => {
  it('ブロックリストをマージし、重複ドメインを除外する', () => {
    const importData = createValidExportData({
      blockList: [
        {
          id: 'b1',
          domain: 'youtube.com',
          isWildcard: false,
          createdAt: '2024-01-01T00:00:00Z',
          enabled: true
        },
        {
          id: 'b2',
          domain: 'twitter.com',
          isWildcard: false,
          createdAt: '2024-01-01T00:00:00Z',
          enabled: true
        }
      ]
    }).data;

    const currentSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      blockList: [
        {
          id: 'existing',
          domain: 'youtube.com',
          isWildcard: false,
          createdAt: '2024-01-01T00:00:00Z',
          enabled: true
        }
      ]
    };

    const { settings } = applyImportedSettings(
      importData,
      currentSettings,
      DEFAULT_VISION
    );
    // youtube.comは既存にあるので追加されない、twitter.comだけ追加
    expect(settings.blockList).toHaveLength(2);
    expect(settings.blockList.map((b) => b.domain)).toContain('twitter.com');
  });

  it('スケジュールをマージし、重複IDを除外する', () => {
    const importData = createValidExportData({
      schedules: [
        {
          id: 's1',
          name: 'Work',
          startTime: '09:00',
          endTime: '17:00',
          days: [1, 2, 3, 4, 5],
          enabled: true
        }
      ]
    }).data;

    const currentSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      schedules: [
        {
          id: 's1',
          name: 'Existing',
          startTime: '08:00',
          endTime: '16:00',
          days: [1],
          enabled: true
        }
      ]
    };

    const { settings } = applyImportedSettings(
      importData,
      currentSettings,
      DEFAULT_VISION
    );
    // 同じIDなのでマージされない
    expect(settings.schedules).toHaveLength(1);
    expect(settings.schedules[0].name).toBe('Existing');
  });

  it('プリセットをマージし、重複IDを除外する', () => {
    const importData = createValidExportData({
      presets: [
        {
          id: 'p1',
          name: 'New Preset',
          createdAt: '2024-01-01T00:00:00Z',
          goalText: 'Goal',
          goalSubText: 'Sub',
          textColor: '#fff',
          backgroundType: 'color',
          backgroundImage: '',
          backgroundColor: '#000',
          customBackgroundData: null,
          fontSettings: { family: 'inter', size: 'md', weight: 'normal' }
        }
      ]
    }).data;

    const { vision } = applyImportedSettings(
      importData,
      DEFAULT_SETTINGS,
      DEFAULT_VISION
    );
    expect(vision.presets).toHaveLength(1);
    expect(vision.presets[0].name).toBe('New Preset');
  });

  it('言語設定がインポートされる', () => {
    const importData = createValidExportData({
      language: 'ja'
    }).data;

    const { settings } = applyImportedSettings(
      importData,
      DEFAULT_SETTINGS,
      DEFAULT_VISION
    );
    expect(settings.language).toBe('ja');
  });

  it('通知設定がインポートされる', () => {
    const importData = createValidExportData({
      notifications: {
        timeLimitEnabled: false,
        timeLimitMinutes: 10
      }
    }).data;

    const { settings } = applyImportedSettings(
      importData,
      DEFAULT_SETTINGS,
      DEFAULT_VISION
    );
    expect(settings.notifications.timeLimitEnabled).toBe(false);
    expect(settings.notifications.timeLimitMinutes).toBe(10);
  });

  it('defaultDisplaySettingsとactivePresetIdが反映される', () => {
    const importData = createValidExportData({
      activePresetId: 'p1',
      defaultDisplaySettings: {
        ...DEFAULT_DISPLAY_SETTINGS,
        goalText: 'Imported Goal'
      }
    }).data;

    const { vision } = applyImportedSettings(
      importData,
      DEFAULT_SETTINGS,
      DEFAULT_VISION
    );
    expect(vision.activePresetId).toBe('p1');
    expect(vision.defaultSettings.goalText).toBe('Imported Goal');
  });
});

describe('createDefaultExportData', () => {
  it('デフォルトのエクスポートデータを生成する', () => {
    const data = createDefaultExportData();
    expect(data.version).toBe(1);
    expect(data.exportedAt).toBeTruthy();
    expect(data.data.blockList).toEqual([]);
    expect(data.data.schedules).toEqual([]);
    expect(data.data.presets).toEqual([]);
    expect(data.data.activePresetId).toBeNull();
  });
});
