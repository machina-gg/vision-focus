import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

/**
 * 事実の表はインメモリの実体に差し替え、書き手（activityService）は実物を通す。
 * 消したかどうかは呼び出しの有無ではなく保存された値で見る
 */
const store = vi.hoisted(() => ({
  activity: undefined as unknown,
  unblockHistory: undefined as unknown
}));

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getUnblockHistory: vi.fn(async () => structuredClone(store.unblockHistory)),
  setUnblockHistory: vi.fn(),
  activityItem: {
    getValue: vi.fn(async () => structuredClone(store.activity ?? {})),
    setValue: vi.fn(async (value: unknown) => {
      store.activity = structuredClone(value);
    }),
    removeValue: vi.fn(async () => {
      store.activity = undefined;
    })
  }
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

import { setUnblockHistory } from '~/lib/storage';
import { updateBlockRules } from '../../blocker';
import { resetActivityHandler as handler } from '../../handlers/reset-activity';
import { toDateKey } from '~/lib/time';
import type { ActivityLog } from '~/types/activity';
import type { UnblockHistory } from '~/types/storage';

const history: UnblockHistory = {
  sites: {
    'example.com': {
      domain: 'example.com',
      status: 'unblocked',
      blockedAt: '2026-01-01T00:00:00.000Z',
      unblockedAt: '2026-01-02T00:00:00.000Z',
      timeAfterUnblock: 0,
      lastActivity: null
    }
  }
};

/** 今日と過去の日の行を用意する */
function givenActivity() {
  const today = toDateKey(new Date());
  const log: ActivityLog = {
    '2026-01-01': { 'example.com': { seconds: 60, blocks: 1, unblocks: 0 } },
    [today]: { 'example.com': { seconds: 120, blocks: 2, unblocks: 1 } }
  };
  store.activity = log;
}

describe('reset-activity ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.activity = undefined;
    store.unblockHistory = structuredClone(history);
  });

  it('今日の分も含めて事実をすべて消す', async () => {
    givenActivity();

    const result = await invoke(handler, undefined);

    expect(result).toEqual({ success: true });
    expect(store.activity).toBeUndefined();
  });

  it('時間制限の使用量が 0 に戻るので、ブロックルールを作り直す', async () => {
    givenActivity();

    await invoke(handler, undefined);

    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('追跡中のサイトの一覧（解除履歴）は消さない', async () => {
    givenActivity();

    await invoke(handler, undefined);

    expect(setUnblockHistory).not.toHaveBeenCalled();
    expect(store.unblockHistory).toEqual(history);
  });

  it('記録が無くても成功する', async () => {
    const result = await invoke(handler, undefined);

    expect(result).toEqual({ success: true });
    expect(store.activity).toBeUndefined();
  });
});
