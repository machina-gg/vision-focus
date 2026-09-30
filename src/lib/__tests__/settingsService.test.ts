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
import {
  changePassword,
  checkUnblockPassword,
  removePassword,
  setPassword
} from '~/lib/settingsService';
import { hashPassword } from '~/lib/password';
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
  createdAt: '2026-01-01T00:00:00.000Z',
  customBackgroundId: null
});

const exported = (id: string, customBackgroundData: string | null = null) => {
  const { customBackgroundId: _id, ...rest } = preset(id);
  return { ...rest, customBackgroundData };
};

const JPEG = 'data:image/jpeg;base64,/9j/AAAA';
const OTHER_JPEG = 'data:image/jpeg;base64,/9j/BBBB';

const imageKey = (imageId: string) => `backgroundImage:${imageId}`;

const givenPresetWithImage = (id: string, imageId: string, dataUrl: string) => {
  fakeChrome.localData.vision = {
    ...DEFAULT_VISION,
    presets: [{ ...preset(id), customBackgroundId: imageId }]
  };
  fakeChrome.localData[imageKey(imageId)] = dataUrl;
};

const storedImageIds = () =>
  Object.keys(fakeChrome.localData)
    .filter((key) => key.startsWith('backgroundImage:'))
    .map((key) => key.slice('backgroundImage:'.length));

// 持ち主（その ID を指すスタイル）のいない画像
const orphanImageIds = async () => {
  const referenced = new Set(
    (await getVision()).presets.map((p) => p.customBackgroundId)
  );
  return storedImageIds().filter((imageId) => !referenced.has(imageId));
};

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

    await setUnblockConfirm({ holdSeconds: 60 }, undefined);

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
  it('スケジュールをファイルのもので置き換え、ファイルに含まれない項目は残す', async () => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      paused: true,
      password: { enabled: true, passwordHash: 'hash' },
      schedules: [schedule('s1'), { ...schedule('local'), days: [3] }]
    });

    await importSettings(
      importedData([{ ...schedule('s1'), name: 'Imported' }, schedule('s2')])
    );

    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      paused: true,
      password: { enabled: true, passwordHash: 'hash' },
      schedules: [{ ...schedule('s1'), name: 'Imported' }, schedule('s2')],
      notifications: { timeLimitEnabled: false, timeLimitMinutes: 10 },
      unblockConfirm: { holdSeconds: 30 }
    });
  });
});

describe('importSettings の表示設定', () => {
  it('スタイルをファイルのもので置き換え、手元にしか無いスタイルは消える', async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets('e1', 'n1');

    const result = await importSettings({
      ...importedData([]),
      presets: [{ ...exported('n1'), name: 'Imported' }, exported('n2')]
    });

    expect(result).toEqual({
      skippedPresets: [],
      clearedActivePreset: false,
      clearedSchedulePresets: false
    });
    expect((await getVision()).presets).toEqual([
      { ...preset('n1'), name: 'Imported' },
      preset('n2')
    ]);
  });

  it(`ファイルのスタイルが ${MAX_PRESETS} 件を超えたら、先頭から上限まで取り込み、残りの名前を返す`, async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets(...presetIds(3, 'e'));

    const result = await importSettings({
      ...importedData([]),
      presets: presetIds(MAX_PRESETS + 2, 'n').map((id) => exported(id))
    });

    expect(result.skippedPresets).toEqual([
      `n${MAX_PRESETS + 1}`,
      `n${MAX_PRESETS + 2}`
    ]);
    expect((await getVision()).presets.map((p) => p.id)).toEqual(
      presetIds(MAX_PRESETS, 'n')
    );
  });

  it('取り込まなかったスタイルを指す適用中の指定とスケジュールの参照を外し、設定と表示設定を 1 回で書く', async () => {
    givenSettings(DEFAULT_SETTINGS);
    const set = vi.spyOn(chrome.storage.local, 'set');
    const presets = presetIds(MAX_PRESETS + 1, 'n');
    const skipped = presets[MAX_PRESETS] as string;

    const result = await importSettings({
      ...importedData([
        { ...schedule('s1'), presetId: skipped },
        { ...schedule('s2'), days: [2], presetId: 'n1' }
      ]),
      presets: presets.map((id) => exported(id)),
      activePresetId: skipped
    });

    expect(result).toEqual({
      skippedPresets: [skipped],
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

  it('適用中の指定と既定の表示設定をファイルの値にする', async () => {
    givenSettings(DEFAULT_SETTINGS);
    givenPresets('e1');

    const result = await importSettings({
      ...importedData([]),
      presets: [exported('n1')],
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
      createdAt: '2026-01-02T03:04:05.000Z',
      customBackgroundId: null
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
    const display = { ...DEFAULT_DISPLAY_SETTINGS, goalText: 'Focus' };

    expect(
      await updatePreset({
        id: 'p1',
        name: 'Renamed',
        display,
        image: { kind: 'keep' }
      })
    ).toBeNull();
    expect((await getVision()).presets).toEqual([
      {
        ...display,
        id: 'p1',
        name: 'Renamed',
        createdAt: '2026-01-01T00:00:00.000Z',
        customBackgroundId: null
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
        display: DEFAULT_DISPLAY_SETTINGS,
        image: { kind: 'set', dataUrl: JPEG }
      })
    ).toBe('not-found');
    expect(storedImageIds()).toEqual([]);
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

describe('スタイルの画像', () => {
  const update = (image: Parameters<typeof updatePreset>[0]['image']) =>
    updatePreset({
      id: 'p1',
      name: 'p1',
      display: DEFAULT_DISPLAY_SETTINGS,
      image
    });

  const imageIdOf = async (presetId: string) =>
    (await getVision()).presets.find((p) => p.id === presetId)
      ?.customBackgroundId;

  it('画像を付けると新しい ID で保存し、スタイルはその ID を持つ', async () => {
    givenPresets('p1');

    expect(await update({ kind: 'set', dataUrl: JPEG })).toBeNull();

    const imageId = await imageIdOf('p1');
    expect(imageId).toEqual(expect.any(String));
    expect(fakeChrome.localData[imageKey(imageId as string)]).toBe(JPEG);
    expect(storedImageIds()).toEqual([imageId]);
  });

  it('差し替えると新しい ID になり、古い画像は消える', async () => {
    givenPresetWithImage('p1', 'img-old', JPEG);

    await update({ kind: 'set', dataUrl: OTHER_JPEG });

    const imageId = await imageIdOf('p1');
    expect(imageId).not.toBe('img-old');
    expect(storedImageIds()).toEqual([imageId]);
    expect(fakeChrome.localData[imageKey(imageId as string)]).toBe(OTHER_JPEG);
  });

  it('同じ画像を選び直しても新しい ID にする', async () => {
    givenPresetWithImage('p1', 'img-old', JPEG);

    await update({ kind: 'set', dataUrl: JPEG });

    expect(await imageIdOf('p1')).not.toBe('img-old');
    expect(storedImageIds()).toHaveLength(1);
  });

  it('外すとスタイルの ID を null にし、画像を消す', async () => {
    givenPresetWithImage('p1', 'img-old', JPEG);

    await update({ kind: 'clear' });

    expect(await imageIdOf('p1')).toBeNull();
    expect(storedImageIds()).toEqual([]);
  });

  it('keep なら ID も画像もそのまま', async () => {
    givenPresetWithImage('p1', 'img-old', JPEG);

    await update({ kind: 'keep' });

    expect(await imageIdOf('p1')).toBe('img-old');
    expect(fakeChrome.localData[imageKey('img-old')]).toBe(JPEG);
  });

  it('スタイルを消すと画像も消える', async () => {
    givenPresetWithImage('p1', 'img-old', JPEG);

    await deletePreset('p1');

    expect((await getVision()).presets).toEqual([]);
    expect(storedImageIds()).toEqual([]);
  });

  it('古い画像を消してから、スタイルを書く', async () => {
    givenPresetWithImage('p1', 'img-old', JPEG);
    const remove = vi.spyOn(chrome.storage.local, 'remove');
    const set = vi.spyOn(chrome.storage.local, 'set');

    await update({ kind: 'set', dataUrl: OTHER_JPEG });

    expect(remove).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledOnce();
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      set.mock.invocationCallOrder[0] ?? 0
    );
    remove.mockRestore();
    set.mockRestore();
  });

  describe('古い画像を消した後で止まったとき', () => {
    it.each([
      ['差し替え', () => update({ kind: 'set', dataUrl: OTHER_JPEG })],
      ['外す', () => update({ kind: 'clear' })],
      ['スタイルの削除', () => deletePreset('p1')],
      [
        '取り込み',
        () => importSettings({ ...importedData([]), presets: [exported('n1')] })
      ]
    ])(
      '%s: 残るのは画像の無い ID だけで、持ち主のいない画像は残らない',
      async (_label, run) => {
        givenPresetWithImage('p1', 'img-old', JPEG);
        const set = vi
          .spyOn(chrome.storage.local, 'set')
          .mockRejectedValueOnce(new Error('stopped'));

        await expect(run()).rejects.toThrow('stopped');

        expect(await imageIdOf('p1')).toBe('img-old');
        expect(storedImageIds()).toEqual([]);
        expect(await orphanImageIds()).toEqual([]);
        set.mockRestore();
      }
    );
  });

  describe('取り込み', () => {
    it('画像は新しい ID で作り、今のスタイルの画像は消す（持ち主のいない画像を残さない）', async () => {
      givenSettings(DEFAULT_SETTINGS);
      givenPresetWithImage('e1', 'img-old', JPEG);
      const set = vi.spyOn(chrome.storage.local, 'set');

      await importSettings({
        ...importedData([]),
        presets: [exported('n1', OTHER_JPEG), exported('n2')]
      });

      expect(set).toHaveBeenCalledOnce();
      const vision = await getVision();
      const newId = vision.presets.find((p) => p.id === 'n1')
        ?.customBackgroundId as string;
      expect(newId).not.toBe('img-old');
      expect(
        vision.presets.find((p) => p.id === 'n2')?.customBackgroundId
      ).toBe(null);
      expect(storedImageIds()).toEqual([newId]);
      expect(fakeChrome.localData[imageKey(newId)]).toBe(OTHER_JPEG);
      expect(await orphanImageIds()).toEqual([]);
      set.mockRestore();
    });

    it('同じ ID のスタイルを取り込んでも、画像は新しい ID で作り直す', async () => {
      givenSettings(DEFAULT_SETTINGS);
      givenPresetWithImage('p1', 'img-old', JPEG);

      await importSettings({
        ...importedData([]),
        presets: [exported('p1', JPEG)]
      });

      const newId = await imageIdOf('p1');
      expect(newId).not.toBe('img-old');
      expect(storedImageIds()).toEqual([newId]);
    });

    it('上限を超えて取り込まなかったスタイルの画像は作らない', async () => {
      givenSettings(DEFAULT_SETTINGS);
      givenPresets();

      await importSettings({
        ...importedData([]),
        presets: [
          ...presetIds(MAX_PRESETS - 1, 'n').map((id) => exported(id)),
          exported('last', JPEG),
          exported('over', OTHER_JPEG)
        ]
      });

      expect(storedImageIds()).toHaveLength(1);
      expect(await orphanImageIds()).toEqual([]);
    });
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

  it('取り込みを続けて呼んだら、後の取り込みの内容になる', async () => {
    givenSettings(DEFAULT_SETTINGS);

    await Promise.all([
      importSettings(importedData([schedule('s1')])),
      importSettings(importedData([schedule('s2')]))
    ]);

    expect((await getSettings()).schedules).toEqual([schedule('s2')]);
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

describe('パスワード', () => {
  const givenPassword = async (password: string | null) => {
    givenSettings({
      ...DEFAULT_SETTINGS,
      schedules: [schedule('s1')],
      password:
        password === null
          ? { enabled: false, passwordHash: null }
          : { enabled: true, passwordHash: await hashPassword(password) }
    });
  };

  describe('setPassword', () => {
    it('SHA-256 の 16 進で保存して保護を始め、他の設定は残す', async () => {
      await givenPassword(null);

      expect(await setPassword('secret')).toBeNull();

      const settings = await getSettings();
      expect(settings.password).toEqual({
        enabled: true,
        passwordHash: await hashPassword('secret')
      });
      expect(settings.password.passwordHash).toMatch(/^[0-9a-f]{64}$/);
      expect(settings.schedules).toEqual([schedule('s1')]);
    });

    it('既に設定済みなら already-set を返し、書き換えない', async () => {
      await givenPassword('old1');

      expect(await setPassword('new1')).toBe('already-set');
      expect((await getSettings()).password.passwordHash).toBe(
        await hashPassword('old1')
      );
    });
  });

  describe('changePassword', () => {
    it('今のパスワードが一致すれば新しいハッシュに置き換える', async () => {
      await givenPassword('old1');

      expect(await changePassword('old1', 'new1')).toBeNull();
      expect((await getSettings()).password).toEqual({
        enabled: true,
        passwordHash: await hashPassword('new1')
      });
    });

    it('今のパスワードが違えば mismatch を返し、書き換えない', async () => {
      await givenPassword('old1');

      expect(await changePassword('wrong', 'new1')).toBe('mismatch');
      expect((await getSettings()).password.passwordHash).toBe(
        await hashPassword('old1')
      );
    });

    it('未設定なら not-set を返す', async () => {
      await givenPassword(null);

      expect(await changePassword('old1', 'new1')).toBe('not-set');
      expect((await getSettings()).password.enabled).toBe(false);
    });
  });

  describe('removePassword', () => {
    it('今のパスワードが一致すれば保護をやめ、ハッシュを消す', async () => {
      await givenPassword('old1');

      expect(await removePassword('old1')).toBeNull();
      expect((await getSettings()).password).toEqual({
        enabled: false,
        passwordHash: null
      });
    });

    it('今のパスワードが違えば mismatch を返し、保護を続ける', async () => {
      await givenPassword('old1');

      expect(await removePassword('wrong')).toBe('mismatch');
      expect((await getSettings()).password.enabled).toBe(true);
    });

    it('未設定なら not-set を返す', async () => {
      await givenPassword(null);

      expect(await removePassword('old1')).toBe('not-set');
    });
  });

  describe('checkUnblockPassword', () => {
    it.each([
      ['弱める操作で一致', 'old1', true, null],
      ['弱める操作で不一致', 'wrong', true, 'mismatch'],
      ['弱める操作で無い', undefined, true, 'required'],
      ['弱めない操作で無い', undefined, false, null],
      ['弱めない操作でも添えられていれば照合する', 'wrong', false, 'mismatch']
    ] as const)(
      '保護中: %s なら %s',
      async (_label, password, weakens, expected) => {
        await givenPassword('old1');

        expect(await checkUnblockPassword(password, weakens)).toBe(expected);
      }
    );

    it.each([
      ['無い', undefined],
      ['違う', 'wrong']
    ] as const)(
      '保護していなければ、パスワードが%sときも通す',
      async (_label, password) => {
        await givenPassword(null);

        expect(await checkUnblockPassword(password, true)).toBeNull();
      }
    );

    it('設定を書き換えない', async () => {
      await givenPassword('old1');
      const before = structuredClone(fakeChrome.localData);

      await checkUnblockPassword('old1', true);

      expect(fakeChrome.localData).toEqual(before);
    });
  });

  describe('setUnblockConfirm', () => {
    const givenHoldSeconds = async (password: string | null) => {
      await givenPassword(password);
      const settings = await getSettings();
      givenSettings({ ...settings, unblockConfirm: { holdSeconds: 30 } });
    };

    it.each([
      ['長くする', 60, undefined],
      ['同じ値にする', 30, undefined],
      ['短くする', 5, undefined],
      ['短くする（パスワードが違っても）', 5, 'wrong']
    ] as const)(
      '保護していなければ、%sときはパスワードを問わず書く',
      async (_label, holdSeconds, password) => {
        await givenHoldSeconds(null);

        expect(await setUnblockConfirm({ holdSeconds }, password)).toBeNull();
        expect((await getSettings()).unblockConfirm).toEqual({ holdSeconds });
      }
    );

    it.each([
      ['短くしてパスワードが無い', 5, undefined, 'required'],
      ['短くしてパスワードが違う', 5, 'wrong', 'mismatch']
    ] as const)(
      '保護中: %s なら %s を返し、書かない',
      async (_label, holdSeconds, password, expected) => {
        await givenHoldSeconds('old1');
        const before = structuredClone(fakeChrome.localData);

        expect(await setUnblockConfirm({ holdSeconds }, password)).toBe(
          expected
        );
        expect(fakeChrome.localData).toEqual(before);
      }
    );

    it.each([
      ['短くしてパスワードが合う', 5, 'old1'],
      ['長くしてパスワードが無い', 60, undefined],
      ['同じ値でパスワードが無い', 30, undefined]
    ] as const)(
      '保護中: %s なら書く',
      async (_label, holdSeconds, password) => {
        await givenHoldSeconds('old1');

        expect(await setUnblockConfirm({ holdSeconds }, password)).toBeNull();
        expect((await getSettings()).unblockConfirm).toEqual({ holdSeconds });
      }
    );

    it('短くするかは書き込みの直前の保存値で決める', async () => {
      await givenHoldSeconds('old1');

      const [lengthened, shortened] = await Promise.all([
        setUnblockConfirm({ holdSeconds: 60 }, undefined),
        setUnblockConfirm({ holdSeconds: 30 }, undefined)
      ]);

      expect(lengthened).toBeNull();
      expect(shortened).toBe('required');
      expect((await getSettings()).unblockConfirm).toEqual({ holdSeconds: 60 });
    });
  });
});
