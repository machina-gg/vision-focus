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

import { importSettings, setPaused } from '~/lib/settingsService';
import { createDefaultExportData } from '~/lib/settingsExport';
import { getSettings } from '~/lib/storage';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
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
