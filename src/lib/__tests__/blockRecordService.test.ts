import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  setLastBlocked: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  recordHostActivity: vi.fn()
}));

import { setLastBlocked } from '~/lib/storage';
import { recordBlockedDomain } from '~/lib/blockRecordService';
import { recordHostActivity } from '~/lib/activityService';
import { itemAt } from '~/test/items';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordBlockedDomain', () => {
  it.each([['always_blocked' as const], ['time_limit_exceeded' as const]])(
    'ブロック画面の表示用に、最後にブロックしたドメインと理由（%s）を 1 つの組で保存する',
    async (reason) => {
      await recordBlockedDomain('example.com', reason);

      expect(setLastBlocked).toHaveBeenCalledWith({
        domain: 'example.com',
        reason
      });
    }
  );

  describe('事実の表（activity）', () => {
    it('ブロックしたホスト名で 1 回のブロックを記録する', async () => {
      await recordBlockedDomain('www.example.com', 'always_blocked');

      expect(recordHostActivity).toHaveBeenCalledOnce();
      const [hosts, toEvent] = itemAt(
        vi.mocked(recordHostActivity).mock.calls,
        0
      );
      expect(hosts).toEqual(['www.example.com']);
      // ホスト名から追跡中のサイトへの引き直しは書き手側が行う
      expect(toEvent('example.com')).toEqual({
        kind: 'block',
        site: 'example.com',
        at: expect.any(Date)
      });
    });

    it('ブロック画面が読む値は、事実の表の書き込みより先に保存する', async () => {
      // 記録より後回しにすると、ブロック画面が「最後にブロックしたドメインと理由」を読み出す時点で未設定になりうる
      await recordBlockedDomain('example.com', 'always_blocked');

      expect(
        vi.mocked(setLastBlocked).mock.invocationCallOrder[0]
      ).toBeLessThan(
        itemAt(vi.mocked(recordHostActivity).mock.invocationCallOrder, 0)
      );
    });
  });
});
