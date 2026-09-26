import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn(),
  incrementSiteBlockCount: vi.fn(),
  setLastBlockedDomain: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  recordHostActivity: vi.fn()
}));

import {
  getAnalytics,
  setAnalytics,
  incrementSiteBlockCount,
  setLastBlockedDomain
} from '~/lib/storage';
import { recordBlockedDomain } from '~/lib/blockRecordService';
import { recordHostActivity } from '~/lib/activityService';
import { DEFAULT_ANALYTICS } from '~/types/storage';

const TODAY = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAnalytics).mockResolvedValue({
    ...DEFAULT_ANALYTICS,
    dailyStats: {}
  });
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
    it('ブロックしたホスト名で 1 回のブロックを記録する', async () => {
      await recordBlockedDomain('www.example.com');

      expect(recordHostActivity).toHaveBeenCalledOnce();
      const [hosts, toEvent] = vi.mocked(recordHostActivity).mock.calls[0];
      expect(hosts).toEqual(['www.example.com']);
      // ホスト名から追跡中のサイトへの引き直しは書き手側が行う
      expect(toEvent('example.com')).toEqual({
        kind: 'block',
        site: 'example.com',
        at: expect.any(Date)
      });
    });

    it('ブロック画面が読む値は、事実の表の書き込みより先に保存する', async () => {
      await recordBlockedDomain('example.com');

      expect(
        vi.mocked(setLastBlockedDomain).mock.invocationCallOrder[0]
      ).toBeLessThan(vi.mocked(recordHostActivity).mock.invocationCallOrder[0]);
    });
  });
});
