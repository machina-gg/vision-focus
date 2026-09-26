import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  setLastBlockedDomain: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  recordHostActivity: vi.fn()
}));

import { setLastBlockedDomain } from '~/lib/storage';
import { recordBlockedDomain } from '~/lib/blockRecordService';
import { recordHostActivity } from '~/lib/activityService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordBlockedDomain', () => {
  it('ブロック画面の表示用に最後にブロックしたドメインを保存する', async () => {
    await recordBlockedDomain('example.com');

    expect(setLastBlockedDomain).toHaveBeenCalledWith('example.com');
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
      // 帯を出すのは「最後にブロックしたドメイン」。記録より後回しにすると
      // ブロック画面が読み出す時点で未設定になりうる（#351）
      await recordBlockedDomain('example.com');

      expect(
        vi.mocked(setLastBlockedDomain).mock.invocationCallOrder[0]
      ).toBeLessThan(vi.mocked(recordHostActivity).mock.invocationCallOrder[0]);
    });
  });
});
