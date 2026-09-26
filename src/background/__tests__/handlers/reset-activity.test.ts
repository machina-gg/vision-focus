import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

const store = vi.hoisted(() => ({
  activity: undefined as unknown
}));

vi.mock('~/lib/storage', () => ({
  getSites: vi.fn(),
  sitesItem: { setValue: vi.fn() },
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

import { sitesItem } from '~/lib/storage';
import { updateBlockRules } from '../../blocker';
import { resetActivityHandler as handler } from '../../handlers/reset-activity';
import { toDateKey } from '~/lib/time';
import type { ActivityLog } from '~/types/activity';

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

  it('追跡中のサイトの一覧は消さない', async () => {
    givenActivity();

    await invoke(handler, undefined);

    expect(sitesItem.setValue).not.toHaveBeenCalled();
  });

  it('記録が無くても成功する', async () => {
    const result = await invoke(handler, undefined);

    expect(result).toEqual({ success: true });
    expect(store.activity).toBeUndefined();
  });
});
