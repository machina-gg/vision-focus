import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

vi.mock('~/lib/time', () => ({
  getTodayKey: vi.fn(() => '2026-08-11')
}));

vi.mock('~/lib/analytics', () => ({
  trackEvent: vi.fn()
}));

import {
  getSettings,
  setSettings,
  getAnalytics,
  setAnalytics
} from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { trackEvent } from '~/lib/analytics';
import handler from '../toggle-block';
import { DEFAULT_SETTINGS, DEFAULT_ANALYTICS } from '~/types/storage';

interface Response {
  success: boolean;
  error?: string;
}

const blockItem = {
  id: 'item-1',
  domain: 'example.com',
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true
};

describe('toggle-block ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      blockList: [{ ...blockItem }]
    });
    vi.mocked(getAnalytics).mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      siteUnblockCounts: {},
      dailyStats: {}
    });
  });

  describe('入力検証', () => {
    it.each([
      ['id が空文字', { id: '', enabled: true }],
      ['id が 100 文字超', { id: 'a'.repeat(101), enabled: true }]
    ])('%s なら Invalid id を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({ success: false, error: 'Invalid id' });
      expect(setSettings).not.toHaveBeenCalled();
    });

    it('enabled が boolean でないなら Invalid enabled value を返す', async () => {
      const result = await invoke<Response>(handler, {
        id: 'item-1',
        enabled: 'true'
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid enabled value'
      });
      expect(setSettings).not.toHaveBeenCalled();
    });

    it('存在しない id なら Item not found を返す', async () => {
      const result = await invoke<Response>(handler, {
        id: 'not-exists',
        enabled: true
      });

      expect(result).toEqual({ success: false, error: 'Item not found' });
      expect(setSettings).not.toHaveBeenCalled();
    });
  });

  describe('有効化（再ブロック）', () => {
    beforeEach(() => {
      vi.mocked(getSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        blockList: [{ ...blockItem, enabled: false }]
      });
    });

    it('enabled を true にして保存しルールを更新する', async () => {
      const result = await invoke<Response>(handler, {
        id: 'item-1',
        enabled: true
      });

      expect(result).toEqual({ success: true });
      expect(setSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          blockList: [expect.objectContaining({ enabled: true })]
        })
      );
      expect(updateBlockRules).toHaveBeenCalledOnce();
    });

    it('既存タブをブロックする', async () => {
      await invoke(handler, { id: 'item-1', enabled: true });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('解除カウントは増やさない', async () => {
      await invoke(handler, { id: 'item-1', enabled: true });

      expect(setAnalytics).not.toHaveBeenCalled();
      expect(trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('無効化（ブロック解除）', () => {
    it('enabled を false にして保存する', async () => {
      const result = await invoke<Response>(handler, {
        id: 'item-1',
        enabled: false
      });

      expect(result).toEqual({ success: true });
      expect(setSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          blockList: [expect.objectContaining({ enabled: false })]
        })
      );
    });

    it('既存タブのブロックは行わない', async () => {
      await invoke(handler, { id: 'item-1', enabled: false });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('サイト別の解除カウントを 1 増やす', async () => {
      await invoke(handler, { id: 'item-1', enabled: false });

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          siteUnblockCounts: expect.objectContaining({
            'example.com': expect.objectContaining({
              domain: 'example.com',
              count: 1
            })
          })
        })
      );
    });

    it('既存の解除カウントに加算する', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        siteUnblockCounts: {
          'example.com': {
            domain: 'example.com',
            count: 3,
            lastUnblocked: '2026-01-01T00:00:00.000Z'
          }
        },
        dailyStats: {}
      });

      await invoke(handler, { id: 'item-1', enabled: false });

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          siteUnblockCounts: expect.objectContaining({
            'example.com': expect.objectContaining({ count: 4 })
          })
        })
      );
    });

    it('当日の解除カウントを増やし、他の集計値は保持する', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        siteUnblockCounts: {},
        dailyStats: {
          '2026-08-11': {
            date: '2026-08-11',
            wasteTime: 600,
            investTime: 1200,
            blockCount: 5,
            unblockCount: 2
          }
        }
      });

      await invoke(handler, { id: 'item-1', enabled: false });

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyStats: expect.objectContaining({
            '2026-08-11': {
              date: '2026-08-11',
              wasteTime: 600,
              investTime: 1200,
              blockCount: 5,
              unblockCount: 3
            }
          })
        })
      );
    });

    it('当日分の集計が無い場合は 0 から作成する', async () => {
      await invoke(handler, { id: 'item-1', enabled: false });

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyStats: expect.objectContaining({
            '2026-08-11': {
              date: '2026-08-11',
              wasteTime: 0,
              investTime: 0,
              blockCount: 0,
              unblockCount: 1
            }
          })
        })
      );
    });

    it('GA4 へはドメインをハッシュ化して送信する（生ドメインを送らない）', async () => {
      await invoke(handler, { id: 'item-1', enabled: false });

      expect(trackEvent).toHaveBeenCalledWith('block_unblock', {
        domain_hashed: expect.any(String)
      });

      const payload = vi.mocked(trackEvent).mock.calls[0][1] as {
        domain_hashed: string;
      };
      expect(payload.domain_hashed).not.toContain('example.com');
    });
  });
});
