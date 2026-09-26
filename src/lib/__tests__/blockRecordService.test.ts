import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn(),
  incrementSiteBlockCount: vi.fn(),
  setLastBlockedDomain: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  appendActivity: vi.fn()
}));

vi.mock('~/lib/siteService', () => ({
  getTrackedSiteKeys: vi.fn()
}));

import {
  getAnalytics,
  setAnalytics,
  incrementSiteBlockCount,
  setLastBlockedDomain
} from '~/lib/storage';
import { recordBlockedDomain } from '~/lib/blockRecordService';
import { appendActivity } from '~/lib/activityService';
import { getTrackedSiteKeys } from '~/lib/siteService';
import { DEFAULT_ANALYTICS } from '~/types/storage';

const TODAY = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAnalytics).mockResolvedValue({
    ...DEFAULT_ANALYTICS,
    dailyStats: {}
  });
  vi.mocked(getTrackedSiteKeys).mockResolvedValue(['example.com']);
});

describe('recordBlockedDomain', () => {
  it('サイト別のブロック回数を増やす', async () => {
    await recordBlockedDomain('example.com');

    expect(incrementSiteBlockCount).toHaveBeenCalledWith('example.com');
  });

  it('ブロック画面の表示用に最後にブロックしたドメインを保存する', async () => {
    await recordBlockedDomain('example.com');

    expect(setLastBlockedDomain).toHaveBeenCalledWith('example.com');
  });

  it('当日のブロック回数を 1 増やす', async () => {
    await recordBlockedDomain('example.com');

    expect(setAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyStats: expect.objectContaining({
          [TODAY]: expect.objectContaining({ blockCount: 1 })
        })
      })
    );
  });

  it('既存の当日集計に加算し、他の値を保持する', async () => {
    vi.mocked(getAnalytics).mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      dailyStats: {
        [TODAY]: {
          date: TODAY,
          wasteTime: 120,
          investTime: 300,
          blockCount: 4,
          unblockCount: 2
        }
      }
    });

    await recordBlockedDomain('example.com');

    expect(setAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyStats: expect.objectContaining({
          [TODAY]: {
            date: TODAY,
            wasteTime: 120,
            investTime: 300,
            blockCount: 5,
            unblockCount: 2
          }
        })
      })
    );
  });

  it('他の日の集計は書き換えない', async () => {
    vi.mocked(getAnalytics).mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      dailyStats: {
        '2000-01-01': {
          date: '2000-01-01',
          wasteTime: 10,
          investTime: 20,
          blockCount: 3,
          unblockCount: 1
        }
      }
    });

    await recordBlockedDomain('example.com');

    expect(setAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyStats: expect.objectContaining({
          '2000-01-01': {
            date: '2000-01-01',
            wasteTime: 10,
            investTime: 20,
            blockCount: 3,
            unblockCount: 1
          }
        })
      })
    );
  });

  it('ブロック画面が読む値は、当日集計の書き込みより先に保存する', async () => {
    // 帯を出すのは「最後にブロックしたドメイン」。集計より後回しにすると
    // ブロック画面が読み出す時点で未設定になりうる（#351）
    await recordBlockedDomain('example.com');

    expect(
      vi.mocked(setLastBlockedDomain).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(setAnalytics).mock.invocationCallOrder[0]);
  });

  describe('事実の表（activity）', () => {
    it('追跡中のサイトに 1 回のブロックを記録する', async () => {
      await recordBlockedDomain('example.com');

      expect(appendActivity).toHaveBeenCalledOnce();
      expect(appendActivity).toHaveBeenCalledWith({
        kind: 'block',
        site: 'example.com',
        at: expect.any(Date)
      });
    });

    it('サブドメイン・www 付きのホスト名は追跡中のサイトに引き直す', async () => {
      await recordBlockedDomain('www.example.com');
      await recordBlockedDomain('m.example.com');

      expect(vi.mocked(appendActivity).mock.calls).toEqual([
        [expect.objectContaining({ kind: 'block', site: 'example.com' })],
        [expect.objectContaining({ kind: 'block', site: 'example.com' })]
      ]);
    });

    it('追跡中のサイトに属さないホスト名なら記録しない', async () => {
      await recordBlockedDomain('other.com');

      expect(appendActivity).not.toHaveBeenCalled();
      // 旧データへの記録は従来どおり行う
      expect(incrementSiteBlockCount).toHaveBeenCalledWith('other.com');
    });

    it('ブロック画面が読む値は、事実の表の書き込みより先に保存する', async () => {
      await recordBlockedDomain('example.com');

      expect(
        vi.mocked(setLastBlockedDomain).mock.invocationCallOrder[0]
      ).toBeLessThan(vi.mocked(appendActivity).mock.invocationCallOrder[0]);
    });
  });
});
