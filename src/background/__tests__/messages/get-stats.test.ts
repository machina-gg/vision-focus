import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('../../tracker', () => ({
  getTodayStats: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  getAllSiteBlockCounts: vi.fn()
}));

import { getTodayStats } from '../../tracker';
import { getAllSiteBlockCounts } from '~/lib/storage';
import handler from '../../messages/get-stats';

interface Response {
  wasteTime: number;
  investTime: number;
  blockCount: number;
  unblockCount: number;
  topBlockedSite: { domain: string; count: number } | null;
}

describe('get-stats ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTodayStats).mockResolvedValue({
      date: '2026-08-11',
      wasteTime: 600,
      investTime: 1800,
      blockCount: 7,
      unblockCount: 2
    });
    vi.mocked(getAllSiteBlockCounts).mockResolvedValue([]);
  });

  it('当日の統計値をそのまま返す', async () => {
    const result = await invoke<Response>(handler, {});

    expect(result).toMatchObject({
      wasteTime: 600,
      investTime: 1800,
      blockCount: 7,
      unblockCount: 2
    });
  });

  it('ブロック回数が最多のサイトを topBlockedSite として返す', async () => {
    vi.mocked(getAllSiteBlockCounts).mockResolvedValue([
      {
        domain: 'x.com',
        count: 12,
        lastBlocked: '2026-08-11T10:00:00.000Z'
      },
      {
        domain: 'youtube.com',
        count: 5,
        lastBlocked: '2026-08-11T09:00:00.000Z'
      }
    ]);

    const result = await invoke<Response>(handler, {});

    expect(result?.topBlockedSite).toEqual({ domain: 'x.com', count: 12 });
  });

  it('ブロック実績が無い場合は topBlockedSite を null にする', async () => {
    const result = await invoke<Response>(handler, {});

    expect(result?.topBlockedSite).toBeNull();
  });

  it('統計取得とブロック回数取得を並行して実行する', async () => {
    await invoke(handler, {});

    expect(getTodayStats).toHaveBeenCalledOnce();
    expect(getAllSiteBlockCounts).toHaveBeenCalledOnce();
  });
});
