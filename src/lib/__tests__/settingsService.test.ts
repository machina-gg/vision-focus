import { describe, expect, it, vi, beforeEach } from 'vitest';

// @wxt-dev/storage は読み込み時に globalThis.chrome を掴むため、import より前に用意する。
// get / set を 1 tick 遅らせないと書き込みの割り込みが作れず、直列化を外しても検査が落ちない
const fakeChrome = vi.hoisted(() => {
  const localData: Record<string, unknown> = {};
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  const localArea = {
    get: async (keys?: string | string[]) => {
      await tick();
      if (typeof keys === 'string') {
        return { [keys]: structuredClone(localData[keys]) };
      }
      if (Array.isArray(keys)) {
        return Object.fromEntries(
          keys.map((key) => [key, structuredClone(localData[key])])
        );
      }
      return structuredClone(localData);
    },
    set: async (items: Record<string, unknown>) => {
      await tick();
      Object.assign(localData, structuredClone(items));
    },
    remove: async (key: string | string[]) => {
      await tick();
      for (const k of Array.isArray(key) ? key : [key]) delete localData[k];
    },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() }
  };

  (globalThis as Record<string, unknown>).chrome = {
    runtime: { id: 'test-extension' },
    storage: { local: localArea, session: { get: vi.fn(), set: vi.fn() } }
  };

  return {
    localData,
    reset: () => {
      for (const key of Object.keys(localData)) delete localData[key];
    }
  };
});

import {
  addSchedule,
  applyPreset,
  createPreset,
  deletePreset,
  importSettings,
  removeSchedule,
  setAnalyticsOptIn,
  setNotifications,
  setPaused,
  setScheduleEnabled,
  setGoalText,
  setUnblockConfirm,
  updatePreset,
  updateSchedule
} from '~/lib/settingsService';
import { createDefaultExportData } from '~/lib/settingsExport';
import { MAX_PRESETS } from '~/constants/limits';
import { getSettings, getVision } from '~/lib/storage';
import { itemAt } from '~/test/items';
import type { ScheduleInput } from '~/types/messageSchemas';
import {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  type AppSettings,
  type DashboardPreset,
  type Schedule
} from '~/types/storage';

const schedule = (id: string): Schedule => ({
  id,
  name: id,
  startTime: '09:00',
  endTime: '17:00',
  days: [1],
  enabled: true
});

const givenSettings = (settings: AppSettings) => {
  fakeChrome.localData.settings = structuredClone(settings);
};

const input = (overrides: Partial<ScheduleInput> = {}): ScheduleInput => ({
  name: 'Work',
  startTime: '09:00',
  endTime: '17:00',
  days: [1],
  ...overrides
});

const preset = (id: string): DashboardPreset => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  id,
  name: id,
  createdAt: '2026-01-01T00:00:00.000Z'
});

const givenPresets = (...ids: string[]) => {
  fakeChrome.localData.vision = {
    ...DEFAULT_VISION,
    presets: ids.map(preset)
  };
};

const presetIds = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);

const importedData = (schedules: Schedule[]) => ({
  ...createDefaultExportData().data,
  schedules,
  notifications: { timeLimitEnabled: false, timeLimitMinutes: 10 as const },
  unblockConfirm: { holdSeconds: 30 as const }
});

beforeEach(() => {
  fakeChrome.reset();
});

describe('setPaused', () => {
  it('一時停止の状態だけを書き換え、他の設定は残す', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, schedules: [schedule('s1')] });

    await setPaused(true);

    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      schedules: [schedule('s1')],
      paused: true
    });
  });
});

describe('addSchedule', () => {
  it('ID を振り、有効な状態で末尾に足す。他の設定は残す', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      paused: true,
      schedules: [schedule('s1')]
    });

    const rejection = await addSchedule(input({ days: [2] }));

    expect(rejection).toBeNull();
    const settings = await getSettings();
    expect(settings.paused).toBe(true);
    expect(settings.schedules).toHaveLength(2);
    const added = itemAt(settings.schedules, 1);
    expect(added).toEqual({
      ...input({ days: [2] }),
      id: added.id,
      enabled: true
    });
    expect(added.id).not.toBe('s1');
    expect(added.id).toMatch(/\S/);
  });

  it('保存済みのスケジュールと重なるなら overlap で拒み、何も書かない', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, schedules: [schedule('s1')] });

    const rejection = await addSchedule(
      input({ startTime: '16:00', endTime: '18:00' })
    );

    expect(rejection).toBe('overlap');
    expect((await getSettings()).schedules).toEqual([schedule('s1')]);
  });

  it('無効なスケジュールとの重なりも拒む', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      schedules: [{ ...schedule('s1'), enabled: false }]
    });

    expect(await addSchedule(input())).toBe('overlap');
  });

  it('保存済みのスタイルを指すなら足す', async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets('p1');

    expect(await addSchedule(input({ presetId: 'p1' }))).toBeNull();
    expect((await getSettings()).schedules[0]?.presetId).toBe('p1');
  });

  it('無いスタイルを指すなら preset-not-found で拒み、何も書かない', async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets('p1');

    expect(await addSchedule(input({ presetId: 'p2' }))).toBe(
      'preset-not-found'
    );
    expect((await getSettings()).schedules).toEqual([]);
  });
});

describe('updateSchedule', () => {
  it('入力値を置き換え、ID と有効・無効は保存済みの値を保つ', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      schedules: [
        { ...schedule('s1'), enabled: false, presetId: 'p1' },
        schedule('s2')
      ]
    });

    const next = input({ name: 'Study', days: [3], endTime: '24:00' });
    const rejection = await updateSchedule('s1', next);

    expect(rejection).toBeNull();
    expect((await getSettings()).schedules).toEqual([
      { ...next, id: 's1', enabled: false },
      schedule('s2')
    ]);
  });

  it('自分自身とは重なりを調べない', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, schedules: [schedule('s1')] });

    expect(await updateSchedule('s1', input({ endTime: '18:00' }))).toBeNull();
  });

  it('他のスケジュールと重なるなら overlap で拒む', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      schedules: [schedule('s1'), { ...schedule('s2'), days: [2] }]
    });

    expect(await updateSchedule('s1', input({ days: [2] }))).toBe('overlap');
    expect((await getSettings()).schedules[0]).toEqual(schedule('s1'));
  });

  it('対象が無ければ not-found で拒む', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, schedules: [schedule('s1')] });

    expect(await updateSchedule('missing', input({ days: [2] }))).toBe(
      'not-found'
    );
    expect((await getSettings()).schedules).toEqual([schedule('s1')]);
  });

  it('無いスタイルを指すなら preset-not-found で拒む', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, schedules: [schedule('s1')] });

    expect(await updateSchedule('s1', input({ presetId: 'p1' }))).toBe(
      'preset-not-found'
    );
  });
});

describe('removeSchedule', () => {
  it('対象だけを消す', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      schedules: [schedule('s1'), schedule('s2')]
    });

    expect(await removeSchedule('s1')).toBeNull();
    expect((await getSettings()).schedules).toEqual([schedule('s2')]);
  });

  it('対象が無ければ not-found で拒む', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, schedules: [schedule('s1')] });

    expect(await removeSchedule('missing')).toBe('not-found');
    expect((await getSettings()).schedules).toEqual([schedule('s1')]);
  });
});

describe('setScheduleEnabled', () => {
  it('一時停止中に有効にしたら、同じ書き込みで一時停止も解く', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      paused: true,
      schedules: [{ ...schedule('s1'), enabled: false }]
    });
    const set = vi.spyOn(chrome.storage.local, 'set');

    const result = await setScheduleEnabled('s1', true);

    expect(result).toEqual({ rejection: null, resumed: true });
    expect(set).toHaveBeenCalledOnce();
    const settings = await getSettings();
    expect(settings.paused).toBe(false);
    expect(settings.schedules).toEqual([schedule('s1')]);
    set.mockRestore();
  });

  it('一時停止していなければ、有効にしても resumed は false', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      schedules: [{ ...schedule('s1'), enabled: false }]
    });

    expect(await setScheduleEnabled('s1', true)).toEqual({
      rejection: null,
      resumed: false
    });
  });

  it('無効にするときは一時停止を解かない', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      paused: true,
      schedules: [schedule('s1')]
    });

    expect(await setScheduleEnabled('s1', false)).toEqual({
      rejection: null,
      resumed: false
    });
    const settings = await getSettings();
    expect(settings.paused).toBe(true);
    expect(settings.schedules).toEqual([{ ...schedule('s1'), enabled: false }]);
  });

  it('対象が無ければ not-found で拒み、一時停止も解かない', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, paused: true });

    expect(await setScheduleEnabled('missing', true)).toEqual({
      rejection: 'not-found'
    });
    expect((await getSettings()).paused).toBe(true);
  });
});

describe('通知・長押し確認・利用状況の送信への同意', () => {
  it('通知の設定だけを書き換える', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, schedules: [schedule('s1')] });

    await setNotifications({ timeLimitEnabled: false, timeLimitMinutes: 1 });

    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      schedules: [schedule('s1')],
      notifications: { timeLimitEnabled: false, timeLimitMinutes: 1 }
    });
  });

  it('長押し確認の設定だけを書き換える', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, paused: true });

    await setUnblockConfirm({ holdSeconds: 60 });

    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      paused: true,
      unblockConfirm: { holdSeconds: 60 }
    });
  });

  it('同意・拒否を選んだ時刻とともに書く', async () => {
    givenSettings(DEFAULT_SETTINGS);

    await setAnalyticsOptIn(true, new Date('2026-01-02T03:04:05.000Z'));

    expect((await getSettings()).analyticsOptIn).toEqual({
      enabled: true,
      decidedAt: '2026-01-02T03:04:05.000Z'
    });
  });
});

describe('importSettings', () => {
  it('保存済みの設定に重ね、取り込みが触れない項目は残す', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      paused: true,
      password: { enabled: true, passwordHash: 'hash' },
      schedules: [schedule('s1')]
    });

    await importSettings(importedData([schedule('s1'), schedule('s2')]));

    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      paused: true,
      password: { enabled: true, passwordHash: 'hash' },
      schedules: [schedule('s1'), schedule('s2')],
      notifications: { timeLimitEnabled: false, timeLimitMinutes: 10 },
      unblockConfirm: { holdSeconds: 30 }
    });
  });
});

describe('importSettings の表示設定', () => {
  it('既存 8 件にファイルの新しい 5 件なら、先頭の 2 件だけを足し、3 件の名前を返す', async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets(...presetIds(8, 'e'));

    const result = await importSettings({
      ...importedData([]),
      presets: presetIds(5, 'n').map(preset)
    });

    expect(result).toEqual({
      skippedPresets: ['n3', 'n4', 'n5'],
      clearedActivePreset: false,
      clearedSchedulePresets: false
    });
    expect((await getVision()).presets.map((p) => p.id)).toEqual([
      ...presetIds(8, 'e'),
      'n1',
      'n2'
    ]);
  });

  it('取り込まなかったスタイルを指す適用中の指定とスケジュールの参照を外し、設定と表示設定を 1 回で書く', async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets(...presetIds(9, 'e'));
    const set = vi.spyOn(chrome.storage.local, 'set');

    const result = await importSettings({
      ...importedData([
        { ...schedule('s1'), presetId: 'n2' },
        { ...schedule('s2'), days: [2], presetId: 'n1' }
      ]),
      presets: presetIds(2, 'n').map(preset),
      activePresetId: 'n2'
    });

    expect(result).toEqual({
      skippedPresets: ['n2'],
      clearedActivePreset: true,
      clearedSchedulePresets: true
    });
    expect(set).toHaveBeenCalledOnce();
    expect((await getVision()).activePresetId).toBeNull();
    expect((await getSettings()).schedules).toEqual([
      schedule('s1'),
      { ...schedule('s2'), days: [2], presetId: 'n1' }
    ]);
    set.mockRestore();
  });

  it('上限に収まれば適用中の指定と既定の表示設定をファイルの値にする', async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets('e1');

    const result = await importSettings({
      ...importedData([]),
      presets: [preset('n1')],
      activePresetId: 'n1',
      defaultDisplaySettings: { ...DEFAULT_DISPLAY_SETTINGS, goalText: 'Goal' }
    });

    expect(result.skippedPresets).toEqual([]);
    const vision = await getVision();
    expect(vision.activePresetId).toBe('n1');
    expect(vision.defaultSettings.goalText).toBe('Goal');
  });
});

describe('createPreset', () => {
  it('既定の表示設定（画像なし）のスタイルを ID を振って末尾に足す', async () => {
    givenPresets('p1');

    const result = await createPreset(
      'Morning',
      new Date('2026-01-02T03:04:05.000Z')
    );

    if (result.rejection) throw new Error('作れなかった');
    const presets = (await getVision()).presets;
    expect(presets).toHaveLength(2);
    expect(itemAt(presets, 1)).toEqual({
      ...DEFAULT_DISPLAY_SETTINGS,
      id: result.id,
      name: 'Morning',
      createdAt: '2026-01-02T03:04:05.000Z'
    });
    expect(result.id).not.toBe('p1');
  });

  it(`${MAX_PRESETS} 件あれば limit で拒み、何も書かない`, async () => {
    givenPresets(...presetIds(MAX_PRESETS, 'p'));

    expect(await createPreset('11th', new Date())).toEqual({
      rejection: 'limit'
    });
    expect((await getVision()).presets).toHaveLength(MAX_PRESETS);
  });
});

describe('updatePreset', () => {
  it('名前と表示設定を置き換え、ID と作成時刻は保つ', async () => {
    givenPresets('p1', 'p2');
    const display = {
      ...DEFAULT_DISPLAY_SETTINGS,
      goalText: 'Focus',
      customBackgroundData: 'data:image/jpeg;base64,AAAA'
    };

    expect(
      await updatePreset({ id: 'p1', name: 'Renamed', display })
    ).toBeNull();
    expect((await getVision()).presets).toEqual([
      {
        ...display,
        id: 'p1',
        name: 'Renamed',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      preset('p2')
    ]);
  });

  it('対象が無ければ not-found で拒む', async () => {
    givenPresets('p1');

    expect(
      await updatePreset({
        id: 'missing',
        name: 'x',
        display: DEFAULT_DISPLAY_SETTINGS
      })
    ).toBe('not-found');
    expect((await getVision()).presets).toEqual([preset('p1')]);
  });
});

describe('applyPreset', () => {
  it('適用中のスタイルにする', async () => {
    givenPresets('p1');

    expect(await applyPreset('p1')).toBeNull();
    expect((await getVision()).activePresetId).toBe('p1');
  });

  it('対象が無ければ not-found で拒む', async () => {
    givenPresets('p1');

    expect(await applyPreset('missing')).toBe('not-found');
    expect((await getVision()).activePresetId).toBeNull();
  });
});

describe('deletePreset', () => {
  it('スタイルを消し、適用中の指定とスケジュールの参照を 1 回の書き込みで外す', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      schedules: [
        { ...schedule('s1'), presetId: 'p1' },
        { ...schedule('s2'), days: [2], presetId: 'p2' }
      ]
    });
    fakeChrome.localData.vision = {
      ...DEFAULT_VISION,
      presets: [preset('p1'), preset('p2')],
      activePresetId: 'p1'
    };
    const set = vi.spyOn(chrome.storage.local, 'set');

    expect(await deletePreset('p1')).toBeNull();

    expect(set).toHaveBeenCalledOnce();
    const vision = await getVision();
    expect(vision.presets).toEqual([preset('p2')]);
    expect(vision.activePresetId).toBeNull();
    expect((await getSettings()).schedules).toEqual([
      schedule('s1'),
      { ...schedule('s2'), days: [2], presetId: 'p2' }
    ]);
    set.mockRestore();
  });

  it('適用中でないスタイルを消しても適用中の指定は残す', async () => {
    fakeChrome.localData.vision = {
      ...DEFAULT_VISION,
      presets: [preset('p1'), preset('p2')],
      activePresetId: 'p2'
    };

    expect(await deletePreset('p1')).toBeNull();
    expect((await getVision()).activePresetId).toBe('p2');
  });

  it('対象が無ければ not-found で拒み、何も書かない', async () => {
    givenPresets('p1');

    expect(await deletePreset('missing')).toBe('not-found');
    expect((await getVision()).presets).toEqual([preset('p1')]);
  });
});

describe('setGoalText', () => {
  it('既定の表示設定の目標文だけを書き換え、スタイルは残す', async () => {
    givenPresets('p1');

    await setGoalText('Ship it');

    expect(await getVision()).toEqual({
      ...DEFAULT_VISION,
      defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS, goalText: 'Ship it' },
      presets: [preset('p1')]
    });
  });
});

describe('書き込みの直列化', () => {
  it('一時停止と取り込みを同時に呼んでも、両方の変更が残る', async () => {
    givenSettings(DEFAULT_SETTINGS);

    await Promise.all([
      setPaused(true),
      importSettings(importedData([schedule('s1')]))
    ]);

    const settings = await getSettings();
    expect(settings.paused).toBe(true);
    expect(settings.schedules).toEqual([schedule('s1')]);
    expect(settings.unblockConfirm).toEqual({ holdSeconds: 30 });
  });

  it('取り込みを続けて呼んでも、先の取り込みで足したスケジュールが消えない', async () => {
    givenSettings(DEFAULT_SETTINGS);

    await Promise.all([
      importSettings(importedData([schedule('s1')])),
      importSettings(importedData([schedule('s2')]))
    ]);

    expect((await getSettings()).schedules).toEqual([
      schedule('s1'),
      schedule('s2')
    ]);
  });

  it('先に足したスケジュールと重なる 2 件目は、同時に呼んでも最新の値で拒む', async () => {
    givenSettings(DEFAULT_SETTINGS);

    const results = await Promise.all([
      addSchedule(input()),
      addSchedule(input({ startTime: '10:00', endTime: '11:00' }))
    ]);

    expect(results).toEqual([null, 'overlap']);
    expect((await getSettings()).schedules).toHaveLength(1);
  });

  it('スケジュールの追加と一時停止を同時に呼んでも、両方の変更が残る', async () => {
    givenSettings(DEFAULT_SETTINGS);

    await Promise.all([setPaused(true), addSchedule(input())]);

    const settings = await getSettings();
    expect(settings.paused).toBe(true);
    expect(settings.schedules).toHaveLength(1);
  });

  it('消したスケジュールの有効化を後から呼んでも、最新の値で not-found になる', async () => {
    givenSettings({ ...DEFAULT_SETTINGS, schedules: [schedule('s1')] });

    const [, toggled] = await Promise.all([
      removeSchedule('s1'),
      setScheduleEnabled('s1', true)
    ]);

    expect(toggled).toEqual({ rejection: 'not-found' });
    expect((await getSettings()).schedules).toEqual([]);
  });

  it('上限の 1 つ手前で同時に 2 件作っても、最新の値で数えて 2 件目を拒む', async () => {
    givenPresets(...presetIds(MAX_PRESETS - 1, 'p'));

    const results = await Promise.all([
      createPreset('a', new Date()),
      createPreset('b', new Date())
    ]);

    expect(results.map((r) => r.rejection)).toEqual([null, 'limit']);
    expect((await getVision()).presets).toHaveLength(MAX_PRESETS);
  });

  it('スタイルの作成と目標文の書き換えを同時に呼んでも、両方の変更が残る', async () => {
    givenPresets('p1');

    await Promise.all([createPreset('a', new Date()), setGoalText('Goal')]);

    const vision = await getVision();
    expect(vision.presets).toHaveLength(2);
    expect(vision.defaultSettings.goalText).toBe('Goal');
  });

  it('スタイルの削除とスケジュールの追加を同時に呼んでも、両方の変更が残る', async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets('p1', 'p2');

    await Promise.all([deletePreset('p1'), addSchedule(input())]);

    expect((await getVision()).presets).toEqual([preset('p2')]);
    expect((await getSettings()).schedules).toHaveLength(1);
  });

  it('前の書き込みが失敗しても、後の書き込みは行う', async () => {
    givenSettings(DEFAULT_SETTINGS);
    const set = vi
      .spyOn(chrome.storage.local, 'set')
      .mockRejectedValueOnce(new Error('storage full'));

    const results = await Promise.allSettled([
      setPaused(true),
      importSettings(importedData([schedule('s1')]))
    ]);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'fulfilled']);
    const settings = await getSettings();
    expect(settings.paused).toBe(false);
    expect(settings.schedules).toEqual([schedule('s1')]);
    set.mockRestore();
  });
});
