import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getUnblockHistory: vi.fn(),
  setUnblockHistory: vi.fn(),
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn()
}));

vi.mock('~/lib/license', () => ({
  canAddToBlocklist: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import {
  getSettings,
  setSettings,
  getUnblockHistory,
  setUnblockHistory,
  getAnalytics,
  setAnalytics
} from '~/lib/storage';
import { canAddToBlocklist } from '~/lib/license';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import handler from '../add-block';
import {
  DEFAULT_SETTINGS,
  DEFAULT_ANALYTICS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';

interface Response {
  success: boolean;
  error?: string;
  limitReached?: boolean;
}

describe('add-block ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      blockList: []
    });
    vi.mocked(getUnblockHistory).mockResolvedValue({
      ...DEFAULT_UNBLOCK_HISTORY,
      sites: {}
    });
    vi.mocked(getAnalytics).mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      siteTime: {},
      siteCategories: {}
    });
    vi.mocked(canAddToBlocklist).mockResolvedValue({
      allowed: true,
      limit: 100
    });
  });

  describe('入力検証', () => {
    it('domain が空なら失敗する', async () => {
      const result = await invoke<Response>(handler, { domain: '' });

      expect(result).toEqual({
        success: false,
        error: 'Domain is required'
      });
      expect(setSettings).not.toHaveBeenCalled();
    });

    it('不正なドメイン形式なら失敗する', async () => {
      const result = await invoke<Response>(handler, {
        domain: 'not a valid domain!!'
      });

      expect(result?.success).toBe(false);
      expect(result?.error).toBe('Invalid domain format');
      expect(setSettings).not.toHaveBeenCalled();
    });

    it('既に登録済みのドメインなら失敗する', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        blockList: [
          {
            id: 'existing',
            domain: 'example.com',
            isWildcard: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            enabled: true
          }
        ]
      });

      const result = await invoke<Response>(handler, {
        domain: 'example.com'
      });

      expect(result?.success).toBe(false);
      expect(result?.error).toBe('Domain already in block list');
      expect(setSettings).not.toHaveBeenCalled();
    });

    it('重複判定は大文字小文字を区別しない', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        blockList: [
          {
            id: 'existing',
            domain: 'example.com',
            isWildcard: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            enabled: true
          }
        ]
      });

      const result = await invoke<Response>(handler, {
        domain: 'EXAMPLE.COM'
      });

      expect(result?.error).toBe('Domain already in block list');
    });
  });

  describe('プラン上限', () => {
    it('上限に達している場合は limitReached を返す', async () => {
      vi.mocked(canAddToBlocklist).mockResolvedValue({
        allowed: false,
        limit: 5,
        reason: 'Free tier limit reached (5 sites).'
      });

      const result = await invoke<Response>(handler, {
        domain: 'example.com'
      });

      expect(result).toEqual({
        success: false,
        error: 'Free tier limit reached (5 sites).',
        limitReached: true
      });
      expect(setSettings).not.toHaveBeenCalled();
    });

    it('reason が無い場合は上限値からエラー文を組み立てる', async () => {
      vi.mocked(canAddToBlocklist).mockResolvedValue({
        allowed: false,
        limit: 5
      });

      const result = await invoke<Response>(handler, {
        domain: 'example.com'
      });

      expect(result?.error).toBe('Limit reached (5 sites)');
      expect(result?.limitReached).toBe(true);
    });

    it('上限判定には現在の登録件数を渡す', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        blockList: [
          {
            id: 'a',
            domain: 'a.com',
            isWildcard: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            enabled: true
          },
          {
            id: 'b',
            domain: 'b.com',
            isWildcard: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            enabled: true
          }
        ]
      });

      await invoke(handler, { domain: 'example.com' });

      expect(canAddToBlocklist).toHaveBeenCalledWith(2);
    });
  });

  describe('追加成功時', () => {
    it('ブロックリストに追加して成功を返す', async () => {
      const result = await invoke<Response>(handler, {
        domain: 'example.com'
      });

      expect(result).toEqual({ success: true });
      expect(setSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          blockList: [
            expect.objectContaining({
              domain: 'example.com',
              isWildcard: false,
              enabled: true
            })
          ]
        })
      );
    });

    it('ワイルドカード指定を解釈する', async () => {
      await invoke(handler, { domain: '*.example.com' });

      expect(setSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          blockList: [expect.objectContaining({ isWildcard: true })]
        })
      );
    });

    it('ブロックルールを更新し既存タブをブロックする', async () => {
      await invoke(handler, { domain: 'example.com' });

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('新規ドメインの追跡履歴を作成する', async () => {
      await invoke(handler, { domain: 'example.com' });

      expect(setUnblockHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sites: expect.objectContaining({
            'example.com': expect.objectContaining({
              domain: 'example.com',
              status: 'blocked',
              unblockedAt: null,
              timeAfterUnblock: 0
            })
          })
        })
      );
    });

    it('再ブロック時は既存の履歴を blocked に戻し計測をリセットする', async () => {
      vi.mocked(getUnblockHistory).mockResolvedValue({
        ...DEFAULT_UNBLOCK_HISTORY,
        sites: {
          'example.com': {
            domain: 'example.com',
            status: 'unblocked',
            blockedAt: '2026-01-01T00:00:00.000Z',
            unblockedAt: '2026-01-02T00:00:00.000Z',
            timeAfterUnblock: 3600,
            lastActivity: '2026-01-02T01:00:00.000Z'
          }
        }
      });

      await invoke(handler, { domain: 'example.com' });

      expect(setUnblockHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sites: expect.objectContaining({
            'example.com': expect.objectContaining({
              status: 'blocked',
              unblockedAt: null,
              timeAfterUnblock: 0,
              lastActivity: null
            })
          })
        })
      );
    });

    it('新規ドメインを waste カテゴリで分析に登録する', async () => {
      await invoke(handler, { domain: 'example.com' });

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          siteTime: expect.objectContaining({
            'example.com': expect.objectContaining({
              domain: 'example.com',
              time: 0,
              category: 'waste'
            })
          }),
          siteCategories: expect.objectContaining({
            'example.com': 'waste'
          })
        })
      );
    });

    it('既存の計測時間は保持しカテゴリのみ waste に変更する', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        siteTime: {
          'example.com': {
            domain: 'example.com',
            time: 1200,
            category: 'neutral',
            lastUpdated: '2026-01-01T00:00:00.000Z'
          }
        },
        siteCategories: {}
      });

      await invoke(handler, { domain: 'example.com' });

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          siteTime: expect.objectContaining({
            'example.com': expect.objectContaining({
              time: 1200,
              category: 'waste'
            })
          })
        })
      );
    });
  });
});
