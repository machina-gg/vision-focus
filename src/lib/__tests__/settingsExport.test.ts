import { describe, expect, it } from 'vitest';

import {
  calculateExportSize,
  hasLargeCustomBackgrounds,
  exportSettings,
  validateImportedData,
  applyImportedSettings,
  createDefaultExportData,
  EXPORT_VERSION,
  type ExportedSettings
} from '~/lib/settingsExport';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';
import type { AppSettings, VisionSettings } from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_UNBLOCK_CONFIRM_SETTINGS
} from '~/types/storage';

function createValidExportData(
  overrides: Partial<ExportedSettings['data']> = {}
): ExportedSettings {
  return {
    version: EXPORT_VERSION,
    exportedAt: '2024-06-12T00:00:00Z',
    data: {
      sites: {},
      schedules: [],
      presets: [],
      defaultDisplaySettings: DEFAULT_DISPLAY_SETTINGS,
      activePresetId: null,
      notifications: DEFAULT_NOTIFICATION_SETTINGS,
      unblockConfirm: DEFAULT_UNBLOCK_CONFIRM_SETTINGS,
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
      sites: sitesOf(
        ...Array.from({ length: 100 }, (_, i) => blockedSite(`site${i}.com`))
      )
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
    const { data, isLarge } = exportSettings(settings, vision, {});
    expect(data.version).toBe(EXPORT_VERSION);
    expect(data.exportedAt).toBeTruthy();
    expect(data.data.sites).toEqual({});
    expect(data.data.schedules).toEqual([]);
    expect(isLarge).toBe(false);
  });

  it('追跡中のサイトとスケジュールが含まれる', () => {
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
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
    const sites = sitesOf(blockedSite('youtube.com'), trackedSite('x.com'));
    const { data } = exportSettings(settings, vision, sites);
    expect(data.data.sites).toEqual(sites);
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

  it('旧版（追跡中のサイトを持たない形）のファイルは形式エラーで拒む', () => {
    // 旧い形式の読み替えは持たない。旧版はブロックリストを配列で持ち、sites が無い
    const old = {
      version: 1,
      exportedAt: '2024-06-12T00:00:00Z',
      data: {
        ...createValidExportData().data,
        sites: undefined,
        blockItems: [{ id: 'b1', domain: 'youtube.com' }]
      }
    };
    const result = validateImportedData(JSON.stringify(old));
    expect(result).toEqual({
      success: false,
      error: 'importErrorInvalidFormat'
    });
  });

  it('sites を持っていても版が古ければ形式エラーで拒む', () => {
    const data = { ...createValidExportData(), version: EXPORT_VERSION - 1 };
    expect(validateImportedData(JSON.stringify(data)).success).toBe(false);
  });

  it('追跡中のサイトの形が崩れていれば形式エラーで拒む', () => {
    const data = createValidExportData();
    const broken = {
      ...data,
      data: {
        ...data.data,
        sites: { 'x.com': { domain: 'x.com', trackedAt: 'x', block: null } }
      }
    };
    expect(validateImportedData(JSON.stringify(broken)).success).toBe(false);
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

  it('language を含む旧形式のファイルも取り込め、language は捨てられる', () => {
    // language は廃止済みの項目で、未知のキーとして無視されるだけで取り込みは成功する
    const data = createValidExportData();
    const withLanguage = {
      ...data,
      data: { ...data.data, language: 'ja' }
    };

    const result = validateImportedData(JSON.stringify(withLanguage));

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('language');
  });

  it('警告がない場合はundefined', () => {
    const data = createValidExportData();
    const result = validateImportedData(JSON.stringify(data));
    expect(result.warnings).toBeUndefined();
  });
});

describe('applyImportedSettings', () => {
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
    expect(data.version).toBe(EXPORT_VERSION);
    expect(data.exportedAt).toBeTruthy();
    expect(data.data.sites).toEqual({});
    expect(data.data.schedules).toEqual([]);
    expect(data.data.presets).toEqual([]);
    expect(data.data.activePresetId).toBeNull();
  });
});

describe('長押しの秒数のエクスポート・インポート', () => {
  const settingsWith30s: AppSettings = {
    ...DEFAULT_SETTINGS,
    unblockConfirm: { holdSeconds: 30 }
  };

  it('書き出して読み戻すと同じ秒数が適用される', () => {
    const { data } = exportSettings(settingsWith30s, DEFAULT_VISION, {});
    expect(data.data.unblockConfirm).toEqual({ holdSeconds: 30 });

    const imported = validateImportedData(JSON.stringify(data));
    expect(imported.success).toBe(true);

    const { settings } = applyImportedSettings(
      imported.data as ExportedSettings['data'],
      DEFAULT_SETTINGS,
      DEFAULT_VISION
    );
    expect(settings.unblockConfirm).toEqual({ holdSeconds: 30 });
  });

  it.each([5, 10, 30, 60])('%i 秒は受け付ける', (holdSeconds) => {
    const json = JSON.stringify({
      ...createValidExportData(),
      data: { ...createValidExportData().data, unblockConfirm: { holdSeconds } }
    });

    expect(validateImportedData(json).success).toBe(true);
  });

  it.each([0, 1, 15, 3600, '5'])(
    '選べない値（%s）は形式エラーで拒む',
    (holdSeconds) => {
      const json = JSON.stringify({
        ...createValidExportData(),
        data: {
          ...createValidExportData().data,
          unblockConfirm: { holdSeconds }
        }
      });

      const result = validateImportedData(json);
      expect(result.success).toBe(false);
      expect(result.error).toBe('importErrorInvalidFormat');
    }
  );
});

describe('必須項目（notifications / unblockConfirm）が無いファイルの取り込み', () => {
  // 既定値へ読み替えない
  it.each(['notifications', 'unblockConfirm'] as const)(
    '%s を持たないファイルは形式エラーで拒む',
    (key) => {
      const full = createValidExportData();
      const { [key]: _omitted, ...data } = full.data;

      const result = validateImportedData(JSON.stringify({ ...full, data }));

      expect(result.success).toBe(false);
      expect(result.error).toBe('importErrorInvalidFormat');
    }
  );
});

describe('追跡中のサイトのエクスポート・インポート', () => {
  it('書き出して読み戻すと同じ追跡中のサイトが得られる', () => {
    const sites = sitesOf(
      blockedSite('x.com', {
        enabled: false,
        timeLimit: { type: 'daily', limitSeconds: 600 }
      }),
      trackedSite('news.example.org'),
      blockedSite(
        YOUTUBE_DOMAIN,
        {},
        { youtube: youtubeFeatures({ hideShorts: true }) }
      )
    );
    const { data } = exportSettings(DEFAULT_SETTINGS, DEFAULT_VISION, sites);

    const imported = validateImportedData(JSON.stringify(data));

    expect(imported.success).toBe(true);
    expect(imported.data?.sites).toEqual(sites);
  });
});
