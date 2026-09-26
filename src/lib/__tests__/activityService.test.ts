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

vi.mock('~/lib/siteService', () => ({
  getTrackedSiteKeys: vi.fn()
}));

import {
  appendActivity,
  clearActivity,
  pruneBefore,
  purgeSite,
  recordActivity,
  recordHostActivity
} from '~/lib/activityService';
import { getTrackedSiteKeys } from '~/lib/siteService';
import { DEFAULT_ACTIVITY } from '~/types/storage';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';

const localDate = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m - 1, d, h, 0, 0);

const row = (seconds: number, blocks = 0, unblocks = 0): DailySiteActivity => ({
  seconds,
  blocks,
  unblocks
});

const stored = () => fakeChrome.localData.activity as ActivityLog | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  fakeChrome.reset();
  vi.mocked(getTrackedSiteKeys).mockResolvedValue(['youtube.com', 'x.com']);
});

describe('appendActivity', () => {
  it('出来事をローカル日付の行・サイトの列へ加算する', async () => {
    const at = localDate(2026, 9, 26);

    await appendActivity(
      { kind: 'stay', site: 'youtube.com', seconds: 5, at },
      { kind: 'stay', site: 'youtube.com', seconds: 5, at },
      { kind: 'block', site: 'youtube.com', at },
      { kind: 'unblock', site: 'x.com', at }
    );

    expect(stored()).toEqual({
      '2026-09-26': {
        'youtube.com': row(10, 1, 0),
        'x.com': row(0, 0, 1)
      }
    });
  });

  it('既存の値に足し、他の日・他のサイトの値は保つ', async () => {
    fakeChrome.localData.activity = {
      '2026-09-25': { 'youtube.com': row(100, 2, 1) },
      '2026-09-26': { 'x.com': row(30, 0, 0), 'youtube.com': row(7, 1, 0) }
    };

    await appendActivity({
      kind: 'stay',
      site: 'youtube.com',
      seconds: 5,
      at: localDate(2026, 9, 26)
    });

    expect(stored()).toEqual({
      '2026-09-25': { 'youtube.com': row(100, 2, 1) },
      '2026-09-26': { 'x.com': row(30, 0, 0), 'youtube.com': row(12, 1, 0) }
    });
  });

  it('日付はローカル時刻の 0 時で切り替わる', async () => {
    await appendActivity(
      {
        kind: 'block',
        site: 'x.com',
        at: localDate(2026, 9, 26, 0)
      },
      {
        kind: 'block',
        site: 'x.com',
        at: new Date(2026, 8, 25, 23, 59, 59)
      }
    );

    expect(stored()).toEqual({
      '2026-09-25': { 'x.com': row(0, 1, 0) },
      '2026-09-26': { 'x.com': row(0, 1, 0) }
    });
  });

  it('追跡中のサイトに無いキーの出来事は捨てる', async () => {
    const at = localDate(2026, 9, 26);

    await appendActivity(
      { kind: 'stay', site: 'example.com', seconds: 5, at },
      { kind: 'block', site: 'x.com', at }
    );

    expect(stored()).toEqual({ '2026-09-26': { 'x.com': row(0, 1, 0) } });
  });

  it('記録できる出来事が 1 件も無ければ書き込まない', async () => {
    await appendActivity({
      kind: 'unblock',
      site: 'example.com',
      at: localDate(2026, 9, 26)
    });

    expect(stored()).toBeUndefined();
  });

  it.each([
    ['0 秒', 0],
    ['負の秒数', -5],
    ['NaN', Number.NaN],
    ['無限大', Number.POSITIVE_INFINITY]
  ])('滞在秒数が %s なら捨てる', async (_label, seconds) => {
    await appendActivity({
      kind: 'stay',
      site: 'x.com',
      seconds,
      at: localDate(2026, 9, 26)
    });

    expect(stored()).toBeUndefined();
  });

  it('出来事を渡さなければ何もしない', async () => {
    await appendActivity();

    expect(getTrackedSiteKeys).not.toHaveBeenCalled();
    expect(stored()).toBeUndefined();
  });

  it('既定値（共有オブジェクト）を書き換えない', async () => {
    await appendActivity({
      kind: 'block',
      site: 'x.com',
      at: localDate(2026, 9, 26)
    });

    expect(DEFAULT_ACTIVITY).toEqual({});
  });

  it('同時に呼んでも加算が消えない（直列化）', async () => {
    const at = localDate(2026, 9, 26);
    const calls = Array.from({ length: 20 }, () =>
      appendActivity({ kind: 'stay', site: 'youtube.com', seconds: 5, at })
    );

    await Promise.all(calls);

    expect(stored()).toEqual({
      '2026-09-26': { 'youtube.com': row(100, 0, 0) }
    });
  });

  it('前の処理が失敗しても後続の処理は実行される', async () => {
    vi.mocked(getTrackedSiteKeys)
      .mockRejectedValueOnce(new Error('読み出し失敗'))
      .mockResolvedValue(['x.com']);
    const at = localDate(2026, 9, 26);

    const failed = appendActivity({ kind: 'block', site: 'x.com', at });
    const next = appendActivity({ kind: 'block', site: 'x.com', at });

    await expect(failed).rejects.toThrow('読み出し失敗');
    await next;
    expect(stored()).toEqual({ '2026-09-26': { 'x.com': row(0, 1, 0) } });
  });
});

describe('purgeSite', () => {
  it('そのサイトの列をすべての日から消し、空になった日の行も消す', async () => {
    fakeChrome.localData.activity = {
      '2026-09-24': { 'youtube.com': row(10) },
      '2026-09-25': { 'youtube.com': row(20), 'x.com': row(5) },
      '2026-09-26': { 'x.com': row(1) }
    };

    await purgeSite('youtube.com');

    expect(stored()).toEqual({
      '2026-09-25': { 'x.com': row(5) },
      '2026-09-26': { 'x.com': row(1) }
    });
  });

  it('加算と同時に呼んでも、消した後の加算は残る（直列化）', async () => {
    fakeChrome.localData.activity = {
      '2026-09-26': { 'youtube.com': row(10) }
    };
    const at = localDate(2026, 9, 26);

    await Promise.all([
      purgeSite('youtube.com'),
      appendActivity({ kind: 'stay', site: 'youtube.com', seconds: 5, at })
    ]);

    expect(stored()).toEqual({
      '2026-09-26': { 'youtube.com': row(5) }
    });
  });
});

describe('pruneBefore', () => {
  it('指定日より前の行を消し、指定日以降は残す', async () => {
    fakeChrome.localData.activity = {
      '2025-09-25': { 'x.com': row(1) },
      '2025-09-26': { 'x.com': row(2) },
      '2026-09-26': { 'x.com': row(3) }
    };

    await pruneBefore('2025-09-26');

    expect(stored()).toEqual({
      '2025-09-26': { 'x.com': row(2) },
      '2026-09-26': { 'x.com': row(3) }
    });
  });

  it('消す行が無ければ書き込まない', async () => {
    const setSpy = vi.spyOn(
      (globalThis as unknown as { chrome: typeof chrome }).chrome.storage.local,
      'set'
    );
    fakeChrome.localData.activity = { '2026-09-26': { 'x.com': row(3) } };

    await pruneBefore('2026-01-01');

    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe('clearActivity', () => {
  it('事実をすべて消す', async () => {
    fakeChrome.localData.activity = {
      '2026-09-26': { 'x.com': row(3) }
    };

    await clearActivity();

    expect(stored()).toBeUndefined();
  });

  it('加算の直後に呼んでも、加算が消去の後に書き戻されない（直列化）', async () => {
    const at = localDate(2026, 9, 26);

    await Promise.all([
      appendActivity({ kind: 'stay', site: 'x.com', seconds: 5, at }),
      clearActivity()
    ]);

    expect(stored()).toBeUndefined();
  });
});

describe('recordActivity', () => {
  it('出来事を記録する', async () => {
    await recordActivity({
      kind: 'unblock',
      site: 'x.com',
      at: localDate(2026, 9, 26)
    });

    expect(stored()).toEqual({ '2026-09-26': { 'x.com': row(0, 0, 1) } });
  });

  it('記録に失敗しても投げず、失敗をログに残す', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    vi.mocked(getTrackedSiteKeys).mockRejectedValueOnce(new Error('失敗'));

    await expect(
      recordActivity({
        kind: 'unblock',
        site: 'x.com',
        at: localDate(2026, 9, 26)
      })
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});

describe('recordHostActivity', () => {
  const at = localDate(2026, 9, 26);
  const stay = (site: string) => ({
    kind: 'stay' as const,
    site,
    seconds: 5,
    at
  });

  it('ホスト名を追跡中のサイトに引き直して記録する', async () => {
    await recordHostActivity(['www.youtube.com'], stay);

    expect(stored()).toEqual({
      '2026-09-26': { 'youtube.com': row(5, 0, 0) }
    });
  });

  it('同じサイトに属するホストは 1 件にまとめる', async () => {
    const toEvent = vi.fn(stay);

    await recordHostActivity(
      ['www.youtube.com', 'm.youtube.com', 'youtube.com', 'x.com'],
      toEvent
    );

    expect(toEvent.mock.calls.map(([site]) => site).sort()).toEqual([
      'x.com',
      'youtube.com'
    ]);
    expect(stored()).toEqual({
      '2026-09-26': { 'youtube.com': row(5, 0, 0), 'x.com': row(5, 0, 0) }
    });
  });

  it('追跡中のサイトに属さないホストは記録しない', async () => {
    const toEvent = vi.fn(stay);

    await recordHostActivity(['example.com', 'notyoutube.com'], toEvent);

    expect(toEvent).not.toHaveBeenCalled();
    expect(stored()).toBeUndefined();
  });

  it('ホストが無ければ追跡中の集合も読まない', async () => {
    await recordHostActivity([], stay);

    expect(getTrackedSiteKeys).not.toHaveBeenCalled();
  });

  it('追跡中の集合の読み出しに失敗しても投げず、失敗をログに残す', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    vi.mocked(getTrackedSiteKeys).mockRejectedValueOnce(new Error('失敗'));

    await expect(
      recordHostActivity(['youtube.com'], stay)
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
