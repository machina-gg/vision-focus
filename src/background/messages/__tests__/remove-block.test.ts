import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getUnblockHistory: vi.fn(),
  setUnblockHistory: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

import {
  getSettings,
  setSettings,
  getUnblockHistory,
  setUnblockHistory
} from '~/lib/storage';
import { updateBlockRules } from '../../blocker';
import handler from '../remove-block';
import { DEFAULT_SETTINGS, DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';

const blockItem = {
  id: 'item-1',
  domain: 'example.com',
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true
};

describe('remove-block ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      blockList: [blockItem]
    });
    vi.mocked(getUnblockHistory).mockResolvedValue({
      ...DEFAULT_UNBLOCK_HISTORY,
      sites: {}
    });
  });

  describe('入力検証', () => {
    it.each([
      ['id が空文字', ''],
      ['id が undefined', undefined],
      ['id が文字列以外', 123],
      ['id が 100 文字超', 'a'.repeat(101)]
    ])('%s の場合は失敗し、設定を変更しない', async (_label, id) => {
      const result = await invoke<{ success: boolean }>(handler, { id });

      expect(result).toEqual({ success: false });
      expect(setSettings).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
    });

    it('id が 100 文字ちょうどなら処理を試行する', async () => {
      const result = await invoke<{ success: boolean }>(handler, {
        id: 'a'.repeat(100)
      });

      // 存在しない id なので削除は起きないが、入力検証は通過して success を返す
      expect(result).toEqual({ success: true });
    });
  });

  describe('削除', () => {
    it('該当項目をブロックリストから削除する', async () => {
      const result = await invoke<{ success: boolean }>(handler, {
        id: 'item-1'
      });

      expect(result).toEqual({ success: true });
      expect(setSettings).toHaveBeenCalledWith(
        expect.objectContaining({ blockList: [] })
      );
      expect(updateBlockRules).toHaveBeenCalledOnce();
    });

    it('該当項目が無い場合は保存もルール更新も行わない', async () => {
      const result = await invoke<{ success: boolean }>(handler, {
        id: 'not-exists'
      });

      // 呼び出し自体は成功扱い（冪等）
      expect(result).toEqual({ success: true });
      expect(setSettings).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(setUnblockHistory).not.toHaveBeenCalled();
    });

    it('複数登録されていても対象のみ削除する', async () => {
      const other = { ...blockItem, id: 'item-2', domain: 'other.com' };
      vi.mocked(getSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        blockList: [blockItem, other]
      });

      await invoke(handler, { id: 'item-1' });

      expect(setSettings).toHaveBeenCalledWith(
        expect.objectContaining({ blockList: [other] })
      );
    });
  });

  describe('追跡履歴の更新', () => {
    it('既存履歴を unblocked に更新し計測をリセットする', async () => {
      vi.mocked(getUnblockHistory).mockResolvedValue({
        ...DEFAULT_UNBLOCK_HISTORY,
        sites: {
          'example.com': {
            domain: 'example.com',
            status: 'blocked',
            blockedAt: '2026-01-01T00:00:00.000Z',
            unblockedAt: null,
            timeAfterUnblock: 999,
            lastActivity: '2026-01-01T10:00:00.000Z'
          }
        }
      });

      await invoke(handler, { id: 'item-1' });

      expect(setUnblockHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sites: expect.objectContaining({
            'example.com': expect.objectContaining({
              status: 'unblocked',
              timeAfterUnblock: 0,
              lastActivity: null,
              // 元のブロック日時は保持する
              blockedAt: '2026-01-01T00:00:00.000Z'
            })
          })
        })
      );
      expect(
        vi.mocked(setUnblockHistory).mock.calls[0][0].sites['example.com']
          .unblockedAt
      ).not.toBeNull();
    });

    it('履歴が無い場合は元のブロック日時を使って新規作成する', async () => {
      await invoke(handler, { id: 'item-1' });

      expect(setUnblockHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sites: expect.objectContaining({
            'example.com': expect.objectContaining({
              domain: 'example.com',
              status: 'unblocked',
              blockedAt: blockItem.createdAt,
              timeAfterUnblock: 0,
              lastActivity: null
            })
          })
        })
      );
    });
  });
});
