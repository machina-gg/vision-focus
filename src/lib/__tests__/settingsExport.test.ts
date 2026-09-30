import { describe, expect, it } from 'vitest';

import {
  calculateExportSize,
  hasLargeCustomBackgrounds,
  exportSettings,
  validateImportedData,
  applyImportedSettings,
  applyImportedVision,
  toImportedSites,
  createDefaultExportData,
  EXPORT_VERSION,
  type ExportedSettings
} from '~/lib/settingsExport';
import { IMAGE_LIMITS, MAX_IMPORT_SIZE } from '~/constants/limits';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import type { ExportedPreset } from '~/types/messageSchemas';
import {
  allowedSite,
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';
import type {
  AppSettings,
  DashboardPreset,
  VisionSettings
} from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_UNBLOCK_CONFIRM_SETTINGS
} from '~/types/storage';
import { itemAt } from '~/test/items';

const JPEG = 'data:image/jpeg;base64,/9j/AAAA';

const storedPreset = (
  id: string,
  customBackgroundId: string | null = null
): DashboardPreset => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  id,
  name: `name-${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  customBackgroundId
});

const exportedPreset = (
  id: string,
  customBackgroundData: string | null = null
): ExportedPreset => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  id,
  name: `name-${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  customBackgroundData
});

const sequentialIds = () => {
  let count = 0;
  return () => `img-new-${++count}`;
};

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
    const { data, isLarge } = exportSettings(settings, vision, {}, {});
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
    const { data } = exportSettings(settings, vision, sites, {});
    expect(data.data.sites).toEqual(sites);
    expect(data.data.schedules).toHaveLength(1);
  });

  it('スタイルの画像を ID ではなく data URL で含め、画像の無い ID は画像なしにする', () => {
    const vision: VisionSettings = {
      ...DEFAULT_VISION,
      presets: [
        storedPreset('p1', 'img-1'),
        storedPreset('p2', 'img-missing'),
        storedPreset('p3')
      ]
    };

    const { data } = exportSettings(
      DEFAULT_SETTINGS,
      vision,
      {},
      {
        'img-1': JPEG
      }
    );

    expect(data.data.presets).toEqual([
      exportedPreset('p1', JPEG),
      exportedPreset('p2'),
      exportedPreset('p3')
    ]);
    expect(data.data.defaultDisplaySettings).not.toHaveProperty(
      'customBackgroundData'
    );
  });
});

describe('validateImportedData', () => {
  it('有効なJSONデータをパースして成功を返す', () => {
    const data = createValidExportData();
    const result = validateImportedData(JSON.stringify(data));
    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
  });

  it('上限（MAX_IMPORT_SIZE）を超えるファイルは、形式エラーではなく大きすぎるとして上限の MB を添えて拒む', () => {
    const result = validateImportedData('x'.repeat(MAX_IMPORT_SIZE + 1));
    expect(result).toEqual({
      success: false,
      error: 'importErrorFileTooLarge',
      errorSubstitutions: ['15']
    });
  });

  it('上限ちょうどの大きさは大きすぎるとしては拒まない', () => {
    const result = validateImportedData(' '.repeat(MAX_IMPORT_SIZE));
    expect(result.error).toBe('importErrorInvalidJson');
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

  it('表示設定のフォントが知らないものなら形式エラーで拒む', () => {
    const data = createValidExportData();
    const broken = {
      ...data,
      data: {
        ...data.data,
        defaultDisplaySettings: {
          ...DEFAULT_DISPLAY_SETTINGS,
          fontSettings: { family: 'comic-sans', size: 'md', weight: 'bold' }
        }
      }
    };
    expect(validateImportedData(JSON.stringify(broken))).toEqual({
      success: false,
      error: 'importErrorInvalidFormat'
    });
  });

  it('sites を持っていても版が古ければ形式エラーで拒む', () => {
    const data = { ...createValidExportData(), version: EXPORT_VERSION - 1 };
    expect(validateImportedData(JSON.stringify(data)).success).toBe(false);
  });

  it('版 3（サイトがブロックの設定を block で持つ形）のファイルは形式エラーで拒む', () => {
    const v3 = {
      version: 3,
      exportedAt: '2024-06-12T00:00:00Z',
      data: {
        ...createValidExportData().data,
        sites: {
          'x.com': {
            domain: 'x.com',
            trackedAt: '2024-06-12T00:00:00Z',
            block: { enabled: true, addedAt: 'x', timeLimit: null },
            youtube: null
          }
        }
      }
    };
    expect(validateImportedData(JSON.stringify(v3))).toEqual({
      success: false,
      error: 'importErrorInvalidFormat'
    });
  });

  it('版 2（画像を表示設定に埋め込んだ形）のファイルは形式エラーで拒む', () => {
    const v2 = {
      version: 2,
      exportedAt: '2024-06-12T00:00:00Z',
      data: {
        ...createValidExportData().data,
        defaultDisplaySettings: {
          ...DEFAULT_DISPLAY_SETTINGS,
          customBackgroundData: null
        },
        presets: [exportedPreset('p1', JPEG)]
      }
    };
    expect(validateImportedData(JSON.stringify(v2))).toEqual({
      success: false,
      error: 'importErrorInvalidFormat'
    });
  });

  it('追跡中のサイトの形が崩れていれば（旧形式の block を含む）形式エラーで拒む', () => {
    const data = createValidExportData();
    const broken = {
      ...data,
      data: {
        ...data.data,
        sites: {
          'x.com': {
            domain: 'x.com',
            trackedAt: 'x',
            block: null,
            youtube: null
          }
        }
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
  const schedule = (id: string, name: string) => ({
    id,
    name,
    startTime: '09:00',
    endTime: '17:00',
    days: [1],
    enabled: true
  });

  it('スケジュールをファイルのもので丸ごと置き換える（手元にしか無いものは消え、同じ ID はファイルの値になる）', () => {
    const importData = createValidExportData({
      schedules: [schedule('s1', 'Imported')]
    }).data;
    const currentSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      schedules: [schedule('s1', 'Existing'), schedule('s2', 'Local only')]
    };

    const settings = applyImportedSettings(importData, currentSettings);

    expect(settings.schedules).toEqual([schedule('s1', 'Imported')]);
  });

  it('通知設定がインポートされる', () => {
    const importData = createValidExportData({
      notifications: {
        timeLimitEnabled: false,
        timeLimitMinutes: 10
      }
    }).data;

    const settings = applyImportedSettings(importData, DEFAULT_SETTINGS);
    expect(settings.notifications.timeLimitEnabled).toBe(false);
    expect(settings.notifications.timeLimitMinutes).toBe(10);
  });

  it('ファイルに含まれない一時停止・パスワード・分析の同意は今の値のまま', () => {
    const currentSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      paused: true,
      password: { enabled: true, passwordHash: 'hash' },
      analyticsOptIn: { enabled: true, decidedAt: '2024-01-01T00:00:00Z' }
    };

    const settings = applyImportedSettings(
      createValidExportData().data,
      currentSettings
    );

    expect(settings.paused).toBe(true);
    expect(settings.password).toEqual({ enabled: true, passwordHash: 'hash' });
    expect(settings.analyticsOptIn).toEqual({
      enabled: true,
      decidedAt: '2024-01-01T00:00:00Z'
    });
  });
});

describe('applyImportedVision', () => {
  const preset = (id: string) => exportedPreset(id);

  it('スタイルをファイルのもので丸ごと置き換える（手元にしか無いものは消え、同じ ID はファイルの値になる）', () => {
    const importData = createValidExportData({
      presets: [{ ...exportedPreset('p1'), name: 'Imported' }]
    }).data;

    const { vision, skippedPresets } = applyImportedVision(
      importData,
      { ...DEFAULT_VISION, presets: [storedPreset('p1'), storedPreset('p2')] },
      10,
      sequentialIds()
    );

    expect(vision.presets).toEqual([
      { ...storedPreset('p1'), name: 'Imported' }
    ]);
    expect(skippedPresets).toEqual([]);
  });

  it('今のスタイルの画像をすべて捨てる画像として返す', () => {
    const { removedImageIds } = applyImportedVision(
      createValidExportData({ presets: [exportedPreset('p1', JPEG)] }).data,
      {
        ...DEFAULT_VISION,
        presets: [
          storedPreset('p1', 'img-1'),
          storedPreset('p2'),
          storedPreset('p3', 'img-3')
        ]
      },
      10,
      sequentialIds()
    );

    expect(removedImageIds).toEqual(['img-1', 'img-3']);
  });

  it('defaultDisplaySettingsとactivePresetIdが反映される', () => {
    const importData = createValidExportData({
      presets: [preset('p1')],
      activePresetId: 'p1',
      defaultDisplaySettings: {
        ...DEFAULT_DISPLAY_SETTINGS,
        goalText: 'Imported Goal'
      }
    }).data;

    const { vision } = applyImportedVision(
      importData,
      DEFAULT_VISION,
      10,
      sequentialIds()
    );
    expect(vision.activePresetId).toBe('p1');
    expect(vision.defaultSettings.goalText).toBe('Imported Goal');
  });

  it('ファイルのスタイルが上限を超えたら、ファイルの並び順に上限まで取り込み、残りを返す（手元の件数は数えない）', () => {
    const existing = ['e1', 'e2', 'e3'].map((id) => storedPreset(id));
    const importData = createValidExportData({
      presets: ['n1', 'n2', 'n3', 'n4', 'n5'].map(preset)
    }).data;

    const { vision, skippedPresets } = applyImportedVision(
      importData,
      { ...DEFAULT_VISION, presets: existing },
      3,
      sequentialIds()
    );

    expect(vision.presets.map((p) => p.id)).toEqual(['n1', 'n2', 'n3']);
    expect(skippedPresets.map((p) => p.id)).toEqual(['n4', 'n5']);
  });

  it('適用中のスタイルが取り込まなかったものなら null にし、取り込んだものなら残す', () => {
    const importData = createValidExportData({
      presets: ['n1', 'n2'].map(preset)
    }).data;

    expect(
      applyImportedVision(
        { ...importData, activePresetId: 'n2' },
        DEFAULT_VISION,
        1,
        sequentialIds()
      ).vision.activePresetId
    ).toBeNull();
    expect(
      applyImportedVision(
        { ...importData, activePresetId: 'n1' },
        DEFAULT_VISION,
        1,
        sequentialIds()
      ).vision.activePresetId
    ).toBe('n1');
  });

  it('取り込むスタイルの画像を新しい ID で作り、スタイルはその ID を持つ', () => {
    const importData = createValidExportData({
      presets: [exportedPreset('n1', JPEG), exportedPreset('n2')]
    }).data;

    const { vision, images } = applyImportedVision(
      importData,
      DEFAULT_VISION,
      10,
      sequentialIds()
    );

    expect(vision.presets).toEqual([
      storedPreset('n1', 'img-new-1'),
      storedPreset('n2')
    ]);
    expect(images).toEqual({ 'img-new-1': JPEG });
  });

  it('上限を超えて取り込まなかったスタイルの画像は作らない', () => {
    const importData = createValidExportData({
      presets: [exportedPreset('n1', JPEG), exportedPreset('n2', JPEG)]
    }).data;

    const { images, skippedPresets } = applyImportedVision(
      importData,
      DEFAULT_VISION,
      1,
      sequentialIds()
    );

    expect(Object.keys(images)).toEqual(['img-new-1']);
    expect(skippedPresets.map((p) => p.id)).toEqual(['n2']);
  });
});

describe('toImportedSites', () => {
  it('ファイルのサイトをそのまま返す（trackedAt もファイルの値）', () => {
    const sites = sitesOf(
      blockedSite('x.com', {}, { trackedAt: '2020-05-05T00:00:00.000Z' }),
      trackedSite('news.example.org'),
      allowedSite('docs.x.com', true)
    );

    expect(toImportedSites(sites)).toEqual(sites);
  });

  it('キーをサイトキーに直し、ドメインとして正しくないものと 2 つ目以降の同じキーは捨てる', () => {
    const result = toImportedSites({
      'www.x.com': blockedSite('www.x.com'),
      'x.com': trackedSite('x.com'),
      bad: trackedSite('not a domain')
    });

    expect(result).toEqual(sitesOf(blockedSite('x.com')));
  });

  it('youtube.com 以外と許可サイトの YouTube 機能は捨てる', () => {
    const features = youtubeFeatures({ hideShorts: true });
    const result = toImportedSites(
      sitesOf(
        blockedSite(YOUTUBE_DOMAIN, {}, { youtube: features }),
        trackedSite('x.com', { youtube: features }),
        allowedSite('y.com', false, { youtube: features })
      )
    );

    expect(result?.[YOUTUBE_DOMAIN]?.youtube).toEqual(features);
    expect(result?.['x.com']?.youtube).toBeNull();
    expect(result?.['y.com']?.youtube).toBeNull();
  });

  it.each([
    ['ブロックの中にブロック', blockedSite('m.x.com')],
    ['ブロックの中に規則なし', trackedSite('m.x.com')]
  ])(
    'ファイルの中に許されない入れ子の組（%s）があれば null',
    (_label, child) => {
      expect(toImportedSites(sitesOf(blockedSite('x.com'), child))).toBeNull();
    }
  );

  it('子孫が許可サイトの入れ子は許す', () => {
    const sites = sitesOf(blockedSite('x.com'), allowedSite('docs.x.com'));

    expect(toImportedSites(sites)).toEqual(sites);
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
    const { data } = exportSettings(settingsWith30s, DEFAULT_VISION, {}, {});
    expect(data.data.unblockConfirm).toEqual({ holdSeconds: 30 });

    const imported = validateImportedData(JSON.stringify(data));
    expect(imported.success).toBe(true);

    if (!imported.data) throw new Error('取り込めなかった');
    const settings = applyImportedSettings(imported.data, DEFAULT_SETTINGS);
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

describe('スタイルの画像の取り込み', () => {
  it('スタイルに customBackgroundData が無いファイルは形式エラーで拒む（null で補わない）', () => {
    const { customBackgroundData: _omitted, ...preset } = exportedPreset('p1');
    const full = createValidExportData();
    const data = { ...full.data, presets: [preset] };

    expect(validateImportedData(JSON.stringify({ ...full, data }))).toEqual({
      success: false,
      error: 'importErrorInvalidFormat'
    });
  });

  it.each([
    ['JPEG でない data URL', 'data:image/png;base64,AAAA'],
    ['data URL でない文字列', 'https://example.com/a.jpg'],
    [
      '上限より長い data URL',
      `data:image/jpeg;base64,${'A'.repeat(IMAGE_LIMITS.TARGET_SIZE)}`
    ]
  ])('画像が%sなら形式エラーで拒む', (_label, dataUrl) => {
    const json = JSON.stringify(
      createValidExportData({ presets: [exportedPreset('p1', dataUrl)] })
    );

    expect(validateImportedData(json)).toEqual({
      success: false,
      error: 'importErrorInvalidFormat'
    });
  });

  it('書き出して読み戻すと、画像が新しい ID で同じ中身に戻る', () => {
    const vision: VisionSettings = {
      ...DEFAULT_VISION,
      presets: [storedPreset('p1', 'img-1')],
      activePresetId: 'p1'
    };
    const { data } = exportSettings(
      DEFAULT_SETTINGS,
      vision,
      {},
      {
        'img-1': JPEG
      }
    );

    const imported = validateImportedData(JSON.stringify(data));
    if (!imported.data) throw new Error('取り込めなかった');
    const { vision: restored, images } = applyImportedVision(
      imported.data,
      DEFAULT_VISION,
      10,
      sequentialIds()
    );

    expect(restored.presets).toEqual([storedPreset('p1', 'img-new-1')]);
    expect(images).toEqual({ 'img-new-1': JPEG });
  });
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
    const { data } = exportSettings(
      DEFAULT_SETTINGS,
      DEFAULT_VISION,
      sites,
      {}
    );

    const imported = validateImportedData(JSON.stringify(data));

    expect(imported.success).toBe(true);
    expect(imported.data?.sites).toEqual(sites);
  });
});

describe('スケジュールの時刻の取り込み', () => {
  const schedule = {
    id: 's1',
    name: 'Work',
    startTime: '09:00',
    endTime: '17:00',
    days: [1],
    enabled: true
  };

  function importWith(startTime: string, endTime: string) {
    return validateImportedData(
      JSON.stringify(
        createValidExportData({
          schedules: [{ ...schedule, startTime, endTime }]
        })
      )
    );
  }

  it.each([
    ['00:00', '23:59'],
    ['23:59', '00:00'],
    ['00:00', '24:00']
  ])('開始 %s・終了 %s は取り込める', (startTime, endTime) => {
    const result = importWith(startTime, endTime);

    expect(result.success).toBe(true);
    expect(itemAt(result.data?.schedules ?? [], 0)).toMatchObject({
      startTime,
      endTime
    });
  });

  it.each([
    ['25:99', '17:00'],
    ['09:00', 'abc'],
    ['', '17:00'],
    ['09:00', ''],
    ['9:00', '17:00'],
    ['09:00', '24:01'],
    ['24:00', '17:00']
  ])(
    '開始 %s・終了 %s を含むファイルは形式エラーで拒む',
    (startTime, endTime) => {
      expect(importWith(startTime, endTime)).toEqual({
        success: false,
        error: 'importErrorInvalidFormat'
      });
    }
  );
});

describe('ファイルの中の入れ子の取り込み', () => {
  it('ファイルの中に許されない入れ子の組があれば形式エラーで拒む', () => {
    const json = JSON.stringify(
      createValidExportData({
        sites: sitesOf(blockedSite('x.com'), trackedSite('m.x.com'))
      })
    );

    expect(validateImportedData(json)).toEqual({
      success: false,
      error: 'importErrorInvalidFormat'
    });
  });
});
